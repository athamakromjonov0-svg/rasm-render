const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const {
    getAllSkins,
    getSkinById,
    createSkin,
    updateSkin,
    deleteSkin
} = require('../controllers/skins.controller');

// Barcha skinlarni olish (ochiq)
router.get('/', getAllSkins);

// ID orqali skinni olish (ochiq)
router.get('/:id', getSkinById);

// Skin va rasm qo'shish — faqat admin.
// Tartib muhim: avval auth/admin (401/403 qaytarsin), keyin multer
// (rad etilgan so'rov faylni diskka yozmasin).
router.post('/', authMiddleware, adminMiddleware, upload.single('file'), createSkin);

// Skinni yangilash, rasm ham ixtiyoriy (yangi rasm kelsa eskisi o'chiriladi) — faqat admin
router.put('/:id', authMiddleware, adminMiddleware, upload.single('file'), updateSkin);
router.patch('/:id', authMiddleware, adminMiddleware, upload.single('file'), updateSkin);

// Skinni o'chirish — faqat admin
router.delete('/:id', authMiddleware, adminMiddleware, deleteSkin);

module.exports = router;
