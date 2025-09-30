const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure required directories/files exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'images.json');

function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function ensureDataFileSync(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
    }
}

ensureDirSync(UPLOADS_DIR);
ensureDirSync(DATA_DIR);
ensureDataFileSync(DATA_FILE);

// Multer storage (no limits as requested)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '';
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]+/g, '_');
        cb(null, `${base}_${timestamp}${ext}`);
    }
});

const upload = multer({ storage });

// helpers for metadata
async function readImages() {
    try {
        const raw = await fsp.readFile(DATA_FILE, 'utf8');
        const list = JSON.parse(raw || '[]');
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

async function writeImages(list) {
    await fsp.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// ฟังก์ชันตรวจสอบ Google Bot
function isGoogleBot(req) {
    const userAgent = req.get('User-Agent') || '';
    const googleBotPatterns = [
        'Googlebot',
        'GoogleBot',
        'googlebot',
        'Mediapartners-Google',
        'AdsBot-Google',
        'Google-AdsBot',
        'Googlebot-Image',
        'Googlebot-Video'
    ];
    
    return googleBotPatterns.some(pattern => userAgent.includes(pattern));
}

// Middleware สำหรับส่งข้อมูล bot detection ไปยัง frontend
app.use((req, res, next) => {
    res.locals.isGoogleBot = isGoogleBot(req);
    next();
});

// JSON parser for any JSON endpoints (not used for file upload)
app.use(express.json());

// ตั้งค่า static files
app.use(express.static(path.join(__dirname)));
// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// API routes for images
app.get('/api/images', async (req, res) => {
    try {
        const list = await readImages();
        const withUrl = list.map(item => ({
            ...item,
            url: `/uploads/${item.filename}`
        }));
        res.json(withUrl);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read images' });
    }
});

app.post('/api/images', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }
        const linkUrl = (req.body && req.body.linkUrl) || '';
        const item = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            linkUrl,
            timestamp: Date.now()
        };
        const list = await readImages();
        list.push(item);
        await writeImages(list);
        res.status(201).json({ ...item, url: `/uploads/${item.filename}` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save image' });
    }
});

app.delete('/api/images/:filename', async (req, res) => {
    const { filename } = req.params;
    try {
        const list = await readImages();
        const idx = list.findIndex(i => i.filename === filename);
        if (idx === -1) {
            return res.status(404).json({ error: 'Not found' });
        }
        const toRemove = list[idx];
        const filePath = path.join(UPLOADS_DIR, toRemove.filename);
        try { await fsp.unlink(filePath); } catch {}
        list.splice(idx, 1);
        await writeImages(list);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

app.delete('/api/images', async (req, res) => {
    try {
        // remove all files in uploads
        const files = await fsp.readdir(UPLOADS_DIR);
        await Promise.all(files.map(async (f) => {
            const fp = path.join(UPLOADS_DIR, f);
            try { await fsp.unlink(fp); } catch {}
        }));
        await writeImages([]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear images' });
    }
});

// เส้นทางหน้าหลัก
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// เส้นทางหน้าแอดมิน
app.get('/admin31', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin31.html'));
});

// เส้นทาง robots.txt
app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(path.join(__dirname, 'robots.txt'));
});

// รันเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Main page: http://localhost:${PORT}`);
    console.log(`admin31 panel: http://localhost:${PORT}/admin31`);
});
