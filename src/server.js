
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();

// JWT sekreti faqat .env / Render Environment da saqlanadi (kodda emas).
// Agar berilmasa — server o'lib qolmasin: vaqtinchalik tasodifiy secret
// generatsiya qilamiz va ogohlantiramiz (har restartda tokenlar bekor bo'ladi).
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = require('crypto').randomBytes(48).toString('hex');
    console.warn(
        "OGOHLANTIRISH: JWT_SECRET berilmadi — vaqtinchalik tasodifiy secret ishlatildi.\n" +
        "Render → Environment (yoki .env) da JWT_SECRET ni belgilang, aks holda\n" +
        "har deploydan keyin foydalanuvchilar sessiyadan chiqib qoladi."
    );
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const skinsRouter = require('./routes/skins.routes');
const uploadRoutes = require('./routes/upload.routes');
const usersRouter = require('./routes/users.routes');
const authRouter = require('./routes/auth.routes');
const casesRouter = require('./routes/cases.routes');
const inventoryRouter = require('./routes/inventory.routes');
const walletRouter = require('./routes/wallet.routes');

const app = express();
const PORT = process.env.PORT || 5432;

app.use(cors());
app.use(express.json());

// Yuklangan fayllarni brauzerda ko'rsatish (upload middleware xuddi shu papkaga yozadi)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Frontend (React + Vite): client/dist build qilingan bo'lsa Express o'zi xizmat qiladi
const CLIENT_DIST = path.join(__dirname, '../client/dist');
const hasClient = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));
if (hasClient) {
    app.use(express.static(CLIENT_DIST));
}

// API routes
app.use('/api/auth', authRouter);
app.use('/api/skins', skinsRouter);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRouter);
app.use('/api/cases', casesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/wallet', walletRouter);

// Multer va boshqa xatolarni JSON ko'rinishida qaytarish
app.use((err, req, res, next) => {
    if (err.name === 'MulterError' || err.status === 400) {
        return res.status(400).json({
            success: false,
            message:
                err.code === 'LIMIT_FILE_SIZE'
                    ? 'Fayl hajmi 5 MB dan oshmasligi kerak'
                    : err.message,
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Serverda kutilmagan xatolik yuz berdi',
    });
});

// MongoDB ulanishi
connectDB();

// Asosiy sahifa: frontend bor bo'lsa — ilova, yo'q bo'lsa — endpointlar ro'yxati
const API_INFO = {
    message: 'Skins API ishlayapti!',
    endpoints: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        getAllSkins: 'GET /api/skins',
        getSkinById: 'GET /api/skins/:id',
        createSkin: 'POST /api/skins',
        updateSkin: 'PUT /api/skins/:id',
        deleteSkin: 'DELETE /api/skins/:id',
        uploadFile: 'POST /api/upload',
        viewUploadedFile: 'GET /uploads/:filename',
        getAllUsers: 'GET /api/users',
        getUserById: 'GET /api/users/:id',
        createUser: 'POST /api/users',
        updateUser: 'PUT /api/users/:id',
        deleteUser: 'DELETE /api/users/:id',
        banUser: 'PATCH /api/users/:id/ban',
        buySkin: 'POST /api/users/:id/buy-skin',
        sellSkin: 'POST /api/users/:id/sell-skin',
        deposit: 'POST /api/users/:id/deposit',
        // Keshlar, inventar va hamyon (docs/FUTURE_API.md bo'yicha)
        listCases: 'GET /api/cases',
        getCaseById: 'GET /api/cases/:id',
        openCase: 'POST /api/cases/:id/open',
        getInventory: 'GET /api/inventory',
        sellInventoryItem: 'POST /api/inventory/:id/sell',
        getWallet: 'GET /api/wallet'
    }
};

// API haqida ma'lumot
app.get('/api', (req, res) => res.json(API_INFO));

// API uchun yaroqsiz yo'llarga JSON 404 (HTML emas)
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: "Bunday endpoint topilmadi",
    });
});

// Asosiy sahifa
app.get('/', (req, res) => {
    if (hasClient) {
        return res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    }
    res.json(API_INFO);
});

// SPA frontend: API va statikdan tashqari barcha GET so'rovlarga index.html
if (hasClient) {
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
        res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
}

// Serverni ishga tushirish
app.listen(PORT, () => {
    console.log(`Server running on: http://localhost:${PORT}`);
    console.log(`Skins API: http://localhost:${PORT}/api/skins`);
    console.log(`Upload API: http://localhost:${PORT}/api/upload`);
});
