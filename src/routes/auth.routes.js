const express = require("express");
const router = express.Router();

const validate = require("../middlewares/validate");
const authMiddleware = require("../middlewares/auth.middleware");
const { registerSchema, loginSchema } = require("../validations/auth.validation");
const { register, login } = require("../controllers/auth.controller");

// POST /api/auth/register — ro'yxatdan o'tish (parol bcrypt bilan hash qilinadi)
router.post("/register", validate(registerSchema), register);

// POST /api/auth/login — kirish, JWT token qaytaradi
router.post("/login", validate(loginSchema), login);

// GET /api/auth/me — joriy foydalanuvchi (token talab qilinadi).
// Frontend sahifani ochganda sessionni shu orqali tiklaydi.
router.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

module.exports = router;
