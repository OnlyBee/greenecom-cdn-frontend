
// Import các thư viện cần thiết
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const { S3Client, DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { URL } = require('url');

// --- CẤU HÌNH ---

const app = express();
// DEBUG ROUTE - KIỂM TRA DB ĐANG DÙNG
app.get('/debug/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, password_hash FROM users');
    res.json({
      db_url: process.env.DATABASE_URL,
      users: result.rows
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// DEBUG ROUTE - RESET LẠI MẬT KHẨU ADMIN VỀ 'Rinnguyen@123'
app.get('/debug/reset-admin', async (req, res) => {
  try {
    const password = 'Rinnguyen@123';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [hash, 'admin']
    );

    res.json({ message: 'Admin password reset OK', hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

// Kết nối Database (Postgres bằng URL) - có SSL cho DigitalOcean
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});


// Kết nối DigitalOcean Spaces (S3-compatible)
const s3Client = new S3Client({
  endpoint: `https://${process.env.SPACES_REGION}.digitaloceanspaces.com`,
  region: process.env.SPACES_REGION,
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  },
});

// Cấu hình Middleware
app.use(cors());
app.use(express.json());

// Cấu hình Multer để xử lý upload file vào bộ nhớ tạm
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('image');

// --- LOGIC XÁC THỰC (MIDDLEWARE) ---

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).send('Access denied. Admins only.');
  }
  next();
}

// --- API ENDPOINTS ---

// AUTH
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (isPasswordCorrect) {
      const accessToken = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ accessToken, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(400).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('!!! LOGIN ERROR:', error);
    res.status(500).json({ error: 'Server error during login process.' });
  }
});

// USERS
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role FROM users');
        res.json(result.rows);
    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', authenticateToken, isAdmin, async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, hashedPassword, 'MEMBER']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    try {
        const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHashedPassword, userId]);

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ error: error.message });
    }
});


app.delete('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1 AND role != $2', [req.params.id, 'ADMIN']);
        res.sendStatus(204);
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// FOLDERS
app.get('/api/folders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM folders ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Get All Folders Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/folders', authenticateToken, isAdmin, async (req, res) => {
    const { name } = req.body;
    try {
        const result = await pool.query('INSERT INTO folders (name) VALUES ($1) RETURNING *', [name]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create Folder Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/folders/:id', authenticateToken, isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const imagesResult = await client.query('SELECT url FROM images WHERE folder_id = $1', [req.params.id]);
        for (const image of imagesResult.rows) {
            const url = new URL(image.url);
            const key = url.pathname.substring(1);
            await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.SPACES_BUCKET, Key: key }));
        }
        await client.query('DELETE FROM folders WHERE id = $1', [req.params.id]);
        await client.query('COMMIT');
        res.sendStatus(204);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete Folder Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.post('/api/folders/assign', authenticateToken, isAdmin, async (req, res) => {
    const { userId, folderId } = req.body;
    try {
        await pool.query('INSERT INTO folder_assignments (user_id, folder_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, folderId]);
        res.sendStatus(200);
    } catch (error) {
        console.error('Assign User Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DATA FOR LOGGED IN USERS
app.get('/api/users/:userId/folders', authenticateToken, async (req, res) => {
    if (req.user.id !== req.params.userId && req.user.role !== 'ADMIN') {
        return res.status(403).send('Forbidden');
    }
    try {
        const result = await pool.query(
            'SELECT f.* FROM folders f JOIN folder_assignments fa ON f.id = fa.folder_id WHERE fa.user_id = $1 ORDER BY f.name ASC',
            [req.params.userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get User Folders Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/folders/:folderId/images', authenticateToken, async (req, res) => {
    const { folderId } = req.params;
    const { id: userId, role } = req.user;

    try {
        if (role !== 'ADMIN') {
            const accessCheck = await pool.query(
                'SELECT 1 FROM folder_assignments WHERE user_id = $1 AND folder_id = $2',
                [userId, folderId]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied to this folder' });
            }
        }

        const result = await pool.query(
            "SELECT id, name, url, uploaded_at as \"uploadedAt\", url as \"displayUrl\" FROM images WHERE folder_id = $1 ORDER BY \"uploadedAt\" DESC", 
            [folderId]
        );
        res.json(result.rows);
    } catch (error) { 
        console.error('Get Images in Folder Error:', error);
        res.status(500).json({ error: error.message }); 
    }
});

// IMAGES
app.post('/api/upload', authenticateToken, upload, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    
    const { folderId, folderSlug } = req.body;
    const key = `${folderSlug}/${Date.now().toString()}-${req.file.originalname}`;

    const uploadParams = {
        Bucket: process.env.SPACES_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ACL: 'public-read',
        ContentType: req.file.mimetype,
    };

    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        const fileUrl = `https://${process.env.SPACES_BUCKET}.${process.env.SPACES_REGION}.digitaloceanspaces.com/${key}`;

        const result = await pool.query(
            'INSERT INTO images (name, url, folder_id) VALUES ($1, $2, $3) RETURNING *',
            [req.file.originalname, fileUrl, folderId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Upload or DB Error:", err);
        res.status(500).json({ error: 'Failed to upload or save image.' });
    }
});

app.delete('/api/images/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const imageResult = await client.query('SELECT url FROM images WHERE id = $1', [req.params.id]);
        if (imageResult.rows.length === 0) {
            return res.status(404).send('Image not found');
        }
        const url = new URL(imageResult.rows[0].url);
        const key = url.pathname.substring(1);
        await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.SPACES_BUCKET, Key: key }));
        await client.query('DELETE FROM images WHERE id = $1', [req.params.id]);
        await client.query('COMMIT');
        res.sendStatus(204);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete Image Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// --- KHỞI ĐỘNG SERVER ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
