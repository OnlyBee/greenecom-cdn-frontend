// backend/server.js

// ---------- IMPORT CÁC THƯ VIỆN ----------
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

// ---------- CẤU HÌNH CƠ BẢN ----------
const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

// Kết nối Database (Postgres) – dùng DATABASE_URL của DO
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

// Middleware chung
app.use(cors());
app.use(express.json());

// Multer để đọc file upload vào memory
const storage = multer.memoryStorage();
const upload = multer({ storage }).single('image');

// ---------- DEBUG ROUTES (tùy chọn) ----------

// Xem nhanh DB đang dùng & list user
app.get(['/debug/users', '/api/debug/users'], async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, password_hash FROM users'
    );
    res.json({
      db_url: process.env.DATABASE_URL,
      users: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset mật khẩu admin về "Rinnguyen@123"
app.get(['/debug/reset-admin', '/api/debug/reset-admin'], async (req, res) => {
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

// ---------- AUTH MIDDLEWARE ----------

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.sendStatus(403);
    // payload sẽ có { id, username, role }
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

// ---------- AUTH ROUTES ----------

// ĐĂNG NHẬP: được map qua /login và /api/login
app.post(['/login', '/api/login'], async (req, res) => {
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

    // Quan trọng: dùng "id" để khớp với các route phía dưới
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------- USERS ----------

// Lấy toàn bộ users (ADMIN)
// Hỗ trợ cả /users và /api/users để tránh lỗi 404
app.get(['/users', '/api/users'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role FROM users ORDER BY username ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tạo user MEMBER mới (ADMIN)
app.post(['/users', '/api/users'], authenticateToken, isAdmin, async (req, res) => {
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

// Đổi mật khẩu cho user đang đăng nhập
app.put(
  ['/users/change-password', '/api/users/change-password'],
  authenticateToken,
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );
      const user = result.rows[0];

      if (!user) return res.status(404).json({ error: 'User not found' });

      const isMatch = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );
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
  }
);

// Xoá user (trừ ADMIN)
app.delete(
  ['/users/:id', '/api/users/:id'],
  authenticateToken,
  isAdmin,
  async (req, res) => {
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
  }
);

// ---------- FOLDERS (ADMIN) ----------

// Lấy tất cả folders (ADMIN)
app.get(['/folders', '/api/folders'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM folders ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get All Folders Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tạo folder mới (ADMIN)
app.post(['/folders', '/api/folders'], authenticateToken, isAdmin, async (req, res) => {
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

// Xoá folder (ADMIN) – xoá luôn ảnh trong S3
app.delete(
  ['/folders/:id', '/api/folders/:id'],
  authenticateToken,
  isAdmin,
  async (req, res) => {
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
  }
);

// Gán user vào folder (ADMIN)
app.post(
  ['/folders/assign', '/api/folders/assign'],
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { userId, folderId } = req.body;
    try {
      await pool.query(
        'INSERT INTO folder_assignments (user_id, folder_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, folderId]
      );
      res.sendStatus(200);
    } catch (error) {
      console.error('Assign User Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ---------- DATA CHO USER ĐÃ LOGIN ----------

// Folders mà user hiện tại được gán (dùng cho sidebar "Folders")
app.get(
  ['/users/:userId/folders', '/api/users/:userId/folders'],
  authenticateToken,
  async (req, res) => {
    const requestedUserId = req.params.userId;
    const currentUser = req.user; // { id, username, role }

    // Nếu không phải ADMIN thì chỉ xem được folder của chính mình
    if (currentUser.role !== 'ADMIN' && currentUser.id !== requestedUserId) {
      return res.status(403).send('Forbidden');
    }

    try {
      const result = await pool.query(
        `SELECT f.*
         FROM folders f
         JOIN folder_assignments fa ON f.id = fa.folder_id
         WHERE fa.user_id = $1
         ORDER BY f.name ASC`,
        [requestedUserId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Get User Folders Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Các ảnh trong 1 folder – có check quyền nếu không phải ADMIN
app.get(
  ['/folders/:folderId/images', '/api/folders/:folderId/images'],
  authenticateToken,
  async (req, res) => {
    const { folderId } = req.params;
    const { id: userId, role } = req.user;

    try {
      if (role !== 'ADMIN') {
        const accessCheck = await pool.query(
          'SELECT 1 FROM folder_assignments WHERE user_id = $1 AND folder_id = $2',
          [userId, folderId]
        );
        if (accessCheck.rows.length === 0) {
          return res
            .status(403)
            .json({ error: 'Access denied to this folder' });
        }
      }

      const result = await pool.query(
        `SELECT id,
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
  }
);

// ---------- IMAGES (UPLOAD / DELETE) ----------

app.post(['/upload', '/api/upload'], authenticateToken, upload, async (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: 'No file uploaded.' });

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
    console.error('Upload or DB Error:', err);
    res.status(500).json({ error: 'Failed to upload or save image.' });
  }
});

app.delete(
  ['/images/:id', '/api/images/:id'],
  authenticateToken,
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const imageResult = await client.query(
        'SELECT url FROM images WHERE id = $1',
        [req.params.id]
      );
      if (imageResult.rows.length === 0) {
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
  }
);

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
