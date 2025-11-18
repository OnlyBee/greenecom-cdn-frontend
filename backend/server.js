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

// --- CẤU HÌNH ---
const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const s3Client = new S3Client({
  endpoint: `https://${process.env.SPACES_REGION}.digitaloceanspaces.com`,
  region: process.env.SPACES_REGION,
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  },
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage }).single('image');

// --- AUTH HELPER ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.sendStatus(403);
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

// --- ROUTES ---

// 1. Login
app.post(['/login', '/api/login'], async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Missing credentials' });

    const result = await pool.query('SELECT id, username, password_hash, role FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid username or password' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid username or password' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Users
app.get(['/users', '/api/users'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role FROM users ORDER BY username ASC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post(['/users', '/api/users'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, 'MEMBER']
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete(['/users/:id', '/api/users/:id'], authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1 AND role != $2', [req.params.id, 'ADMIN']);
    res.sendStatus(204);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put(['/users/change-password', '/api/users/change-password'], authenticateToken, async (req, res) => {
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
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Folders
app.get(['/folders', '/api/folders'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM folders ORDER BY name ASC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post(['/folders', '/api/folders'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('INSERT INTO folders (name) VALUES ($1) RETURNING *', [req.body.name]);
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete(['/folders/:id', '/api/folders/:id'], authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const images = await client.query('SELECT url FROM images WHERE folder_id = $1', [req.params.id]);
    for (const img of images.rows) {
      try {
        const u = new URL(img.url);
        await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.SPACES_BUCKET, Key: u.pathname.substring(1) }));
      } catch (err) { /* ignore invalid url errors */ }
    }
    await client.query('DELETE FROM folders WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.sendStatus(204);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

app.post(['/folders/assign', '/api/folders/assign'], authenticateToken, isAdmin, async (req, res) => {
  const { userId, folderId } = req.body;
  try {
    await pool.query(
      'INSERT INTO folder_assignments (user_id, folder_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, folderId]
    );
    // FIX: Return JSON so frontend doesn't crash on response.json()
    res.status(200).json({ success: true, message: 'Assigned successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. View Data (Folders/Images)
app.get(['/users/:userId/folders', '/api/users/:userId/folders'], authenticateToken, async (req, res) => {
  const { userId } = req.params;
  if (req.user.role !== 'ADMIN' && req.user.id !== userId) return res.status(403).send('Forbidden');
  try {
    const result = await pool.query(
      `SELECT f.* FROM folders f JOIN folder_assignments fa ON f.id = fa.folder_id WHERE fa.user_id = $1 ORDER BY f.name ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get(['/folders/:folderId/images', '/api/folders/:folderId/images'], authenticateToken, async (req, res) => {
  const { folderId } = req.params;
  try {
    if (req.user.role !== 'ADMIN') {
      const check = await pool.query('SELECT 1 FROM folder_assignments WHERE user_id = $1 AND folder_id = $2', [req.user.id, folderId]);
      if (check.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
    }
    const result = await pool.query(
      `SELECT id, name, url, uploaded_at AS "uploadedAt", url AS "displayUrl" FROM images WHERE folder_id = $1 ORDER BY "uploadedAt" DESC`,
      [folderId]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Upload & Delete Images

// Upload File (Multipart)
app.post(['/upload', '/api/upload'], authenticateToken, upload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const { folderId, folderSlug } = req.body;
    // Sanitize filename to prevent issues with spaces/unicode in S3 Keys
    const safeFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const slug = folderSlug || 'default';
    const key = `${slug}/${Date.now()}-${safeFilename}`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.SPACES_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ACL: 'public-read',
      ContentType: req.file.mimetype,
    }));
    
    const fileUrl = `https://${process.env.SPACES_BUCKET}.${process.env.SPACES_REGION}.digitaloceanspaces.com/${key}`;
    
    const result = await pool.query(
      'INSERT INTO images (name, url, folder_id) VALUES ($1, $2, $3) RETURNING *',
      [req.file.originalname, fileUrl, folderId]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { 
    console.error('Upload Error:', e); 
    res.status(500).json({ error: 'Upload failed' }); 
  }
});

// Upload URL (JSON)
app.post(['/upload/url', '/api/upload/url'], authenticateToken, async (req, res) => {
  const { folderId, imageUrl } = req.body;
  if (!folderId || !imageUrl) return res.status(400).json({ error: 'Missing info' });

  try {
    let fileName = 'image-from-url.jpg';
    try {
      const u = new URL(imageUrl);
      const pathParts = u.pathname.split('/');
      if (pathParts.length > 0) {
        const last = pathParts[pathParts.length - 1];
        // Sanitize
        if (last) fileName = last.replace(/[^a-zA-Z0-9.-]/g, '_');
      }
    } catch (err) {}

    const result = await pool.query(
      'INSERT INTO images (name, url, folder_id) VALUES ($1, $2, $3) RETURNING *',
      [fileName, imageUrl, folderId]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Save URL failed' }); }
});

app.delete(['/images/:id', '/api/images/:id'], authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const imgRes = await client.query('SELECT url FROM images WHERE id = $1', [req.params.id]);
    if (imgRes.rows.length > 0) {
      const u = new URL(imgRes.rows[0].url);
      if (u.hostname.includes('digitaloceanspaces.com')) {
        await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.SPACES_BUCKET, Key: u.pathname.substring(1) }));
      }
      await client.query('DELETE FROM images WHERE id = $1', [req.params.id]);
    }
    await client.query('COMMIT');
    res.sendStatus(204);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
