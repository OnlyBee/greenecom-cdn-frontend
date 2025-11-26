
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

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- DB INIT ---
const initDb = async () => {
    try {
        // Ensure stats table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usage_stats (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                feature VARCHAR(50) NOT NULL,
                used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Database initialized");
    } catch (err) { console.error("DB Init Error", err); }
};
initDb();

// --- S3 CONFIG ---
const spacesRegion = process.env.SPACES_REGION ? process.env.SPACES_REGION.trim() : 'sgp1';
const spacesBucket = process.env.SPACES_BUCKET ? process.env.SPACES_BUCKET.trim() : 'greene';
const spacesEndpoint = process.env.SPACES_ENDPOINT ? process.env.SPACES_ENDPOINT.trim() : `https://${spacesRegion}.digitaloceanspaces.com`;
let cdnBaseUrl = `https://${spacesBucket}.${spacesRegion}.digitaloceanspaces.com`;
if (process.env.CDN_URL) cdnBaseUrl = process.env.CDN_URL.trim().replace(/\/+$/, '');

const s3Client = new S3Client({
  endpoint: spacesEndpoint,
  region: spacesRegion,
  forcePathStyle: false, 
  credentials: {
    accessKeyId: process.env.SPACES_KEY ? process.env.SPACES_KEY.trim() : '',
    secretAccessKey: process.env.SPACES_SECRET ? process.env.SPACES_SECRET.trim() : '',
  },
});

const slugify = (text) => {
  if (!text) return 'default';
  return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
};

app.use(cors());
app.use(express.json());
const storage = multer.memoryStorage();
const upload = multer({ storage }).single('image');

// --- AUTH ---
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
  if (!req.user || req.user.role !== 'ADMIN') return res.status(403).send('Admins only.');
  next();
}

// --- ROUTES ---
app.post(['/login', '/api/login'], async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT id, username, password_hash, role FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid' });
    const user = result.rows[0];
    if (!(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ message: 'Invalid' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username, role: user.role });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

app.get(['/users', '/api/users'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`SELECT u.id, u.username, u.role, COALESCE(json_agg(json_build_object('id', f.id, 'name', f.name)) FILTER (WHERE f.id IS NOT NULL), '[]') as assigned_folders FROM users u LEFT JOIN folder_assignments fa ON u.id = fa.user_id LEFT JOIN folders f ON fa.folder_id = f.id GROUP BY u.id ORDER BY u.username ASC`);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post(['/users', '/api/users'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const result = await pool.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role', [req.body.username, hashed, 'MEMBER']);
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete(['/users/:id', '/api/users/:id'], authenticateToken, isAdmin, async (req, res) => {
  try { await pool.query('DELETE FROM users WHERE id = $1 AND role != $2', [req.params.id, 'ADMIN']); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put(['/users/change-password', '/api/users/change-password'], authenticateToken, async (req, res) => {
  try {
    const user = (await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])).rows[0];
    if (!user || !(await bcrypt.compare(req.body.currentPassword, user.password_hash))) return res.status(400).json({ error: 'Incorrect password' });
    const hashed = await bcrypt.hash(req.body.newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get(['/folders', '/api/folders'], authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`SELECT f.*, COALESCE(json_agg(json_build_object('id', u.id, 'username', u.username)) FILTER (WHERE u.id IS NOT NULL), '[]') as assigned_users FROM folders f LEFT JOIN folder_assignments fa ON f.id = fa.folder_id LEFT JOIN users u ON fa.user_id = u.id GROUP BY f.id ORDER BY f.name ASC`);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post(['/folders', '/api/folders'], authenticateToken, isAdmin, async (req, res) => {
  try { const resDb = await pool.query('INSERT INTO folders (name) VALUES ($1) RETURNING *', [req.body.name]); res.status(201).json(resDb.rows[0]); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post(['/folders/assign', '/api/folders/assign'], authenticateToken, isAdmin, async (req, res) => {
  try { await pool.query('INSERT INTO folder_assignments (user_id, folder_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.body.userId, req.body.folderId]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete(['/folders/:folderId/users/:userId', '/api/folders/:folderId/users/:userId'], authenticateToken, isAdmin, async (req, res) => {
  try { await pool.query('DELETE FROM folder_assignments WHERE folder_id = $1 AND user_id = $2', [req.params.folderId, req.params.userId]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete(['/folders/:id', '/api/folders/:id'], authenticateToken, isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const imgs = await client.query('SELECT url FROM images WHERE folder_id = $1', [req.params.id]);
        for (const img of imgs.rows) {
            try { await s3Client.send(new DeleteObjectCommand({ Bucket: spacesBucket, Key: new URL(img.url).pathname.substring(1) })); } catch (e) {}
        }
        await client.query('DELETE FROM folders WHERE id = $1', [req.params.id]);
        await client.query('COMMIT');
        res.sendStatus(204);
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); } finally { client.release(); }
});

app.get(['/users/:userId/folders', '/api/users/:userId/folders'], authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN' && String(req.user.id) !== String(req.params.userId)) return res.status(403).send('Forbidden');
  try { const result = await pool.query(`SELECT f.* FROM folders f JOIN folder_assignments fa ON f.id = fa.folder_id WHERE fa.user_id = $1 ORDER BY f.name ASC`, [req.params.userId]); res.json(result.rows); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get(['/folders/:folderId/images', '/api/folders/:folderId/images'], authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      const check = await pool.query('SELECT 1 FROM folder_assignments WHERE user_id = $1 AND folder_id = $2', [req.user.id, req.params.folderId]);
      if (check.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
    }
    const result = await pool.query(`SELECT id, name, url, uploaded_at AS "uploadedAt", url AS "displayUrl" FROM images WHERE folder_id = $1 ORDER BY "uploadedAt" DESC`, [req.params.folderId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post(['/upload', '/api/upload'], authenticateToken, upload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  try {
    const { folderId, folderSlug } = req.body;
    let slug = folderSlug;
    if (!slug) slug = (await pool.query('SELECT name FROM folders WHERE id = $1', [folderId])).rows[0]?.name || 'default';
    const key = `${slugify(slug)}/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    await s3Client.send(new PutObjectCommand({ Bucket: spacesBucket, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype, ACL: 'public-read' }));
    try { await s3Client.send(new PutObjectAclCommand({ Bucket: spacesBucket, Key: key, ACL: 'public-read' })); } catch (e) {}
    
    const result = await pool.query('INSERT INTO images (name, url, folder_id) VALUES ($1, $2, $3) RETURNING *', [req.file.originalname, `${cdnBaseUrl}/${key}`, folderId]);
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post(['/upload/url', '/api/upload/url'], authenticateToken, async (req, res) => {
  try {
    const folderName = (await pool.query('SELECT name FROM folders WHERE id = $1', [req.body.folderId])).rows[0]?.name;
    if (!folderName) return res.status(404).json({ error: 'Folder not found' });
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(req.body.imageUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error('Fetch failed');
    
    const buffer = Buffer.from(await resp.arrayBuffer());
    const ext = (resp.headers.get('content-type') || '').includes('png') ? '.png' : '.jpg';
    const fileName = `image-${Date.now()}${ext}`;
    const key = `${slugify(folderName)}/${Date.now()}-${fileName}`;
    
    await s3Client.send(new PutObjectCommand({ Bucket: spacesBucket, Key: key, Body: buffer, ContentType: resp.headers.get('content-type'), ACL: 'public-read' }));
    try { await s3Client.send(new PutObjectAclCommand({ Bucket: spacesBucket, Key: key, ACL: 'public-read' })); } catch (e) {}
    
    const result = await pool.query('INSERT INTO images (name, url, folder_id) VALUES ($1, $2, $3) RETURNING *', [fileName, `${cdnBaseUrl}/${key}`, req.body.folderId]);
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put(['/images/:id', '/api/images/:id'], authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
             const check = await pool.query(`SELECT 1 FROM images i JOIN folder_assignments fa ON i.folder_id = fa.folder_id WHERE i.id = $1 AND fa.user_id = $2`, [req.params.id, req.user.id]);
             if (check.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
        }
        const result = await pool.query('UPDATE images SET name = $1 WHERE id = $2 RETURNING *', [req.body.name, req.params.id]);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete(['/images/:id', '/api/images/:id'], authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const img = (await client.query('SELECT url FROM images WHERE id = $1', [req.params.id])).rows[0];
    if (img) {
        try { await s3Client.send(new DeleteObjectCommand({ Bucket: spacesBucket, Key: new URL(img.url).pathname.substring(1) })); } catch(e){}
        await client.query('DELETE FROM images WHERE id = $1', [req.params.id]);
    }
    await client.query('COMMIT');
    res.sendStatus(204);
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); } finally { client.release(); }
});

// --- STATS TRACKING ENDPOINTS ---
app.post(['/stats/record', '/api/stats/record'], authenticateToken, async (req, res) => {
  try {
    await pool.query('INSERT INTO usage_stats (user_id, feature) VALUES ($1, $2)', [req.user.id, req.body.feature]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get(['/stats', '/api/stats'], authenticateToken, async (req, res) => {
    // Allow all users to fetch stats for now to verify visibility
    try {
        const result = await pool.query(`
            SELECT u.username, 
            COUNT(CASE WHEN s.feature = 'variation' THEN 1 END) as variation_count, 
            COUNT(CASE WHEN s.feature = 'mockup' THEN 1 END) as mockup_count, 
            COUNT(s.id) as total_count 
            FROM users u 
            LEFT JOIN usage_stats s ON u.id = s.user_id 
            GROUP BY u.id, u.username 
            ORDER BY total_count DESC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
