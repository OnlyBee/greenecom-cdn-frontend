// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const { URL } = require('url');

// --- CẤU HÌNH CƠ BẢN ---
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

// Kết nối Postgres qua DATABASE_URL (DigitalOcean)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Kết nối DigitalOcean Spaces (S3 compatible)
const s3Client = new S3Client({
  endpoint: `https://${process.env.SPACES_REGION}.digitaloceanspaces.com`,
  region: process.env.SPACES_REGION,
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  },
});

const app = express();

// --- MIDDLEWARE CHUNG ---
app.use(cors());
app.use(express.json());

// Multer: lưu file upload vào bộ nhớ tạm
const storage = multer.memoryStorage();
const upload = multer({ storage }).single('image');

// --- ROUTE KIỂM TRA SERVER ---
app.get('/', (req, res) => {
  res.send('Greenecom CDN backend is running');
});

// --- DEBUG ROUTES ---

// Xem toàn bộ user + DB URL hiện tại
app.get('/debug/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, password_hash FROM users'
    );
    res.json({
      db_url: process.env.DATABASE_URL,
      users: result.rows,
    });
  } catch (err) {
    console.error('Debug users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset mật khẩu admin về 'Rinnguyen@123'
app.get('/debug/reset-admin', async (req, res) => {
  try {
    const password = 'Rinnguyen@123';
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [hash, 'admin']
    );

    res.json({ message: 'Admin password reset OK', hash });
  } catch (err) {
    console.error('Reset admin error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- MIDDLEWARE AUTH ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer xxx"

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.sendStatus(403);
    // payload: { userId, role, iat, exp }
    req.user = payload;
    next();
  });
}

function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).send('Access denied. Admins only.');
  }
  next();
}

// --- AUTH: LOGIN ---
// Frontend đang gọi POST https://image.greenecom.net/login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    const result = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// --- USERS ---

// GET /users  (ADMIN xem danh sách user)
app.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /users  (ADMIN tạo user mới, mặc định role MEMBER)
app.post('/users', authenticateToken, isAdmin, async (req, res) => {
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

// PUT /users/change-password  (User tự đổi mật khẩu)
app.put('/users/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch)
      return res.status(400).json({ error: 'Incorrect current password' });

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      newHashedPassword,
      userId,
    ]);

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /users/:id  (ADMIN xoá user, trừ ADMIN khác)
app.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM users WHERE id = $1 AND role != $2',
      [req.params.id, 'ADMIN']
    );
    res.sendStatus(204);
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- FOLDERS ---

// GET /folders  (ADMIN xem tất cả folder)
app.get('/folders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM folders ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get All Folders Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /folders  (ADMIN tạo folder)
app.post('/folders', authenticateToken, isAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO folders (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create Folder Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /folders/:id  (ADMIN xoá folder + ảnh bên trong)
app.delete('/folders/:id', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const imagesResult = await client.query(
      'SELECT url FROM images WHERE folder_id = $1',
      [req.params.id]
    );

    for (const image of imagesResult.rows) {
      const url = new URL(image.url);
      const key = url.pathname.substring(1);
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.SPACES_BUCKET,
          Key: key,
        })
      );
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

// Handler dùng chung cho assign (để tạo alias route)
async function handleAssignFolder(req, res) {
  const { userId, folderId } = req.body;

  if (!userId || !folderId) {
    return res
      .status(400)
      .json({ error: 'userId and folderId are required.' });
  }

  try {
    await pool.query(
      'INSERT INTO folder_assignments (user_id, folder_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, folderId]
    );
    res.status(200).json({ message: 'Assigned OK' });
  } catch (error) {
    console.error('Assign User Error:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /folders/assign  (ADMIN gán user vào folder)
// và /api/folders/assign để phòng trường hợp frontend dùng prefix /api
app.post('/folders/assign', authenticateToken, isAdmin, handleAssignFolder);
app.post('/api/folders/assign', authenticateToken, isAdmin, handleAssignFolder);

// --- DATA CHO USER ĐÃ LOGIN ---

// GET /users/:userId/folders  (User xem các folder mình được gán)
app.get('/users/:userId/folders', authenticateToken, async (req, res) => {
  const { userId, role } = req.user;
  const targetId = req.params.userId;

  if (String(userId) !== String(targetId) && role !== 'ADMIN') {
    return res.status(403).send('Forbidden');
  }

  try {
    const result = await pool.query(
      `SELECT f.*
       FROM folders f
       JOIN folder_assignments fa ON f.id = fa.folder_id
       WHERE fa.user_id = $1
       ORDER BY f.name ASC`,
      [targetId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get User Folders Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /folders/:folderId/images  (User xem ảnh trong folder nếu có quyền)
app.get('/folders/:folderId/images', authenticateToken, async (req, res) => {
  const { folderId } = req.params;
  const { userId, role } = req.user;

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
      `SELECT
         id,
         name,
         url,
         uploaded_at AS "uploadedAt",
         url AS "displayUrl"
       FROM images
       WHERE folder_id = $1
       ORDER BY "uploadedAt" DESC`,
      [folderId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get Images in Folder Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- IMAGES ---

// Handler upload file (từ máy)
async function handleUploadFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { folderId, folderSlug } = req.body;

  if (!folderId || !folderSlug) {
    return res
      .status(400)
      .json({ error: 'folderId and folderSlug are required.' });
  }

  const key = `${folderSlug}/${Date.now().toString()}-${req.file.originalname}`;

  const uploadParams = {
    Bucket: process.env.SPACES_BUCKET,
    Key: key,
    Body: req.file.buffer,
    ACL: 'public-read',
    ContentType: req.file.mimetype,
  };

  try {
    // Upload lên Spaces
    await s3Client.send(new PutObjectCommand(uploadParams));

    // URL public của file trên Spaces
    const fileUrl = `https://${process.env.SPACES_BUCKET}.${process.env.SPACES_REGION}.digitaloceanspaces.com/${key}`;

    // Lưu DB
    const result = await pool.query(
      'INSERT INTO images (name, url, folder_id) VALUES ($1, $2, $3) RETURNING *',
      [req.file.originalname, fileUrl, folderId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Upload or DB Error:', err);
    res.status(500).json({ error: err.message });
  }
}

// Handler upload URL
async function handleUploadUrl(req, res) {
  const { folderId, imageUrl } = req.body;

  if (!folderId || !imageUrl) {
    return res
      .status(400)
      .json({ error: 'folderId and imageUrl are required.' });
  }

  try:
    // Lấy tên file từ URL cho đẹp
    let fileName = 'image-from-url';
    try {
      const u = new URL(imageUrl);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length > 0) fileName = parts[parts.length - 1];
    } catch (e) {
      // URL không hợp lệ cũng không sao, dùng tên default
    }

    const result = await pool.query(
      'INSERT INTO images (name, url, folder_id) VALUES ($1, $2, $3) RETURNING *',
      [fileName, imageUrl, folderId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Upload URL Error:', err);
    res.status(500).json({ error: err.message });
  }
}

// Alias route cho upload file:
// - /upload
// - /api/upload
app.post('/upload', authenticateToken, upload, handleUploadFile);
app.post('/api/upload', authenticateToken, upload, handleUploadFile);

// Alias route cho upload URL:
// - /upload/url
// - /api/upload/url
app.post('/upload/url', authenticateToken, handleUploadUrl);
app.post('/api/upload/url', authenticateToken, handleUploadUrl);

// DELETE /images/:id  (xoá ảnh)
app.delete('/images/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const imageResult = await client.query(
      'SELECT url FROM images WHERE id = $1',
      [req.params.id]
    );
    if (imageResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).send('Image not found');
    }

    const url = new URL(imageResult.rows[0].url);
    const key = url.pathname.substring(1);

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.SPACES_BUCKET,
        Key: key,
      })
    );

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

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
