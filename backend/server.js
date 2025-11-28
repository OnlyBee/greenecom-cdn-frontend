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
  PutObjectAclCommand 
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

// Init DB Tables
const initDb = async () => {
  try {
    // Stats Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage_stats (
        feature_name VARCHAR(50) PRIMARY KEY,
        usage_count INT DEFAULT 0,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Settings Table (For API Keys)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT
      );
    `);
    
    console.log("DB Tables initialized");
  } catch (err) {
    console.error("Error initializing DB:", err);
  }
};
initDb();

// --- S3 CONFIG (FIXED FOR SGP1) ---
const spacesRegion = process.env.SPACES_REGION ? process.env.SPACES_REGION.trim() : 'sgp1';
const spacesBucket = process.env.SPACES_BUCKET ? process.env.SPACES_BUCKET.trim() : 'greene';
const spacesEndpoint = process.env.SPACES_ENDPOINT 
  ? process.env.SPACES_ENDPOINT.trim() 
  : `https://${spacesRegion}.digitaloceanspaces.com`;

let cdnBaseUrl = `https://${spacesBucket}.${spacesRegion}.digitaloceanspaces.com`;
if (process.env.CDN_URL) {
  cdnBaseUrl = process.env.CDN_URL.trim().replace(/\/+$/, '');
}

const s3Config = {
  endpoint: spacesEndpoint,
  region: spacesRegion,
  forcePathStyle: false, 
  credentials: {
    accessKeyId: process.env.SPACES_KEY ? process.env.SPACES_KEY.trim() : '',
    secretAccessKey: process.env.SPACES_SECRET ? process.env.SPACES_SECRET.trim() : '',
  },
};

const s3Client = new S3Client(s3Config);

// --- HELPER FUNCTIONS ---
const slugify = (text) => {
  if (!text) return 'default';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

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
    res.json({ token, username: user.username, role: user.role }); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Users
app.get(['/users', '/api/users'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.role,
        COALESCE(
          json_agg(json_build_object('id', f.id, 'name', f.name)) 
          FILTER (WHERE f.id IS NOT NULL), 
          '[]'
        ) as assigned_folders
      FROM users u
      LEFT JOIN folder_assignments fa ON u.id = fa.user_id
      LEFT JOIN folders f ON fa.folder_id = f.id
      GROUP BY u.id
      ORDER BY u.username ASC
    `;
    const result = await pool.query(query);
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
    const query = `
      SELECT 
        f.*,
        COALESCE(
          json_agg(json_build_object('id', u.id, 'username', u.username)) 
          FILTER (WHERE u.id IS NOT NULL), 
          '[]'
        ) as assigned_users
      FROM folders f
      LEFT JOIN folder_assignments fa ON f.id = fa.folder_id
      LEFT JOIN users u ON fa.user_id = u.id
      GROUP BY f.id
      ORDER BY f.name ASC
    `;
    const result = await pool.query(query);
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
        await s3Client.send(new DeleteObjectCommand({ Bucket: spacesBucket, Key: u.pathname.substring(1) }));
      } catch (err) { /* ignore */ }
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
    res.status(200).json({ success: true, message: 'Assigned successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete(['/folders/:folderId/users/:userId', '/api/folders/:folderId/users/:userId'], authenticateToken, isAdmin, async (req, res) => {
  const { folderId, userId } = req.params;
  try {
    await pool.query('DELETE FROM folder_assignments WHERE folder_id = $1 AND user_id = $2', [folderId, userId]);
    res.sendStatus(204);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. View Data
app.get(['/users/:userId/folders', '/api/users/:userId/folders'], authenticateToken, async (req, res) => {
  const { userId } = req.params;
  if (req.user.role !== 'ADMIN' && String(req.user.id) !== String(userId)) {
      return res.status(403).send('Forbidden');
  }
  
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

// 5. UPLOAD (Multipart)
app.post(['/upload', '/api/upload'], authenticateToken, upload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const { folderId, folderSlug } = req.body;
    if (!folderId) return res.status(400).json({ error: 'Folder ID missing' });

    const safeFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    let slug = folderSlug;
    if (!slug) {
         const fRes = await pool.query('SELECT name FROM folders WHERE id = $1', [folderId]);
         slug = fRes.rows.length > 0 ? slugify(fRes.rows[0].name) : 'default';
    }
    
    const key = `${slug}/${Date.now()}-${safeFilename}`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: spacesBucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    }));

    try {
        await s3Client.send(new PutObjectAclCommand({ Bucket: spacesBucket, Key: key, ACL: 'public-read' }));
    } catch (aclErr) {}
    
    const fileUrl = `${cdnBaseUrl}/${key}`;
    const result = await pool.query(
      'INSERT INTO images (name, url, folder_id) VALUES ($1, $2, $3) RETURNING *',
      [req.file.originalname, fileUrl, folderId]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { 
    res.status(500).json({ error: e.message, code: e.Code }); 
  }
});

app.post(['/upload/url', '/api/upload/url'], authenticateToken, async (req, res) => {
  const { folderId, imageUrl } = req.body;
  if (!folderId || !imageUrl) return res.status(400).json({ error: 'Missing info' });

  try {
    const folderRes = await pool.query('SELECT name FROM folders WHERE id = $1', [folderId]);
    if (folderRes.rows.length === 0) return res.status(404).json({ error: 'Folder not found' });
    const folderSlug = slugify(folderRes.rows[0].name);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    let response;
    try {
        response = await fetch(imageUrl, { signal: controller.signal });
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('Timeout: Image took too long to download');
        throw err;
    } finally { clearTimeout(timeout); }

    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
        return res.status(400).json({ error: 'URL does not point to a valid image' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('gif')) ext = '.gif';
    else if (contentType.includes('webp')) ext = '.webp';

    let fileName = `image-${Date.now()}${ext}`;
    try {
      const u = new URL(imageUrl);
      const parts = u.pathname.split('/');
      const last = parts[parts.length - 1];
      if (last && last.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          fileName = last.replace(/[^a-zA-Z0-9.-]/g, '_');
      }
    } catch(e) {}

    const key = `${folderSlug}/${Date.now()}-${fileName}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: spacesBucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    }));

    try {
        await s3Client.send(new PutObjectAclCommand({ Bucket: spacesBucket, Key: key, ACL: 'public-read' }));
    } catch (aclErr) {}

    const fileUrl = `${cdnBaseUrl}/${key}`;
    const result = await pool.query(
      'INSERT INTO images (name, url, folder_id) VALUES ($1, $2, $3) RETURNING *',
      [fileName, fileUrl, folderId]
    );
    res.status(201).json(result.rows[0]);

  } catch (e) { 
    res.status(500).json({ error: e.message || 'Save URL failed' }); 
  }
});

app.put(['/images/:id', '/api/images/:id'], authenticateToken, async (req, res) => {
    const { name } = req.body;
    const imageId = req.params.id;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        if (req.user.role !== 'ADMIN') {
             const permCheck = await pool.query(`
                SELECT 1 FROM images i JOIN folder_assignments fa ON i.folder_id = fa.folder_id WHERE i.id = $1 AND fa.user_id = $2
             `, [imageId, req.user.id]);
             if (permCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
        }

        const result = await pool.query('UPDATE images SET name = $1 WHERE id = $2 RETURNING *', [name, imageId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Image not found' });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete(['/images/:id', '/api/images/:id'], authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const imgRes = await client.query('SELECT url FROM images WHERE id = $1', [req.params.id]);
    if (imgRes.rows.length > 0) {
      const u = new URL(imgRes.rows[0].url);
      if (u.hostname.includes('digitaloceanspaces.com') || u.hostname.includes('greenecom.net')) {
        const key = u.pathname.substring(1);
        await s3Client.send(new DeleteObjectCommand({ Bucket: spacesBucket, Key: key }));
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

// 6. STATS TRACKING
app.post(['/stats/track', '/api/stats/track'], authenticateToken, async (req, res) => {
  const { feature } = req.body;
  if (!feature) return res.status(400).json({ error: 'Feature name required' });
  try {
    const query = `
      INSERT INTO usage_stats (feature_name, usage_count, last_used_at)
      VALUES ($1, 1, NOW())
      ON CONFLICT (feature_name)
      DO UPDATE SET usage_count = usage_stats.usage_count + 1, last_used_at = NOW();
    `;
    await pool.query(query, [feature]);
    res.status(200).json({ message: 'Tracked' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get(['/stats', '/api/stats'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usage_stats ORDER BY usage_count DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. SYSTEM SETTINGS (GEMINI KEY)
// Get API Key (available to authenticated members so they can use the tool)
app.get(['/settings/gemini', '/api/settings/gemini'], authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'");
        if (result.rows.length > 0) {
            res.json({ key: result.rows[0].setting_value });
        } else {
            res.json({ key: null });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update API Key (Admin only)
app.put(['/settings/gemini', '/api/settings/gemini'], authenticateToken, isAdmin, async (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });
    try {
        const query = `
            INSERT INTO system_settings (setting_key, setting_value)
            VALUES ('gemini_api_key', $1)
            ON CONFLICT (setting_key)
            DO UPDATE SET setting_value = $1
        `;
        await pool.query(query, [key]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));