const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

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

// ตั้งค่า static files
app.use(express.static(path.join(__dirname)));

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
