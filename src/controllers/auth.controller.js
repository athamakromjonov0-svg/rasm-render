const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const { isDuplicateKeyError, getDuplicateField } = require("../utils/dbErrors");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Parol hech qachon javobga tushmaydi (modelda ham toJSON transform bor,
// bu yerda qo'lda yana bir marta o'chiramiz — ikki qatlamli himoya)
const toPublicUser = (user) => {
  const obj = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};

// POST /api/auth/register
// 1) maydonlarni tekshirish (Joi middleware da), 2) dublikat tekshiruvi,
// 3) yaratish (parol model pre('save') hookida bcrypt bilan hash qilinadi)
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Mavjudlikni oldindan tekshiramiz (homework qadami 5)
    const existing = await User.findOne({
      $or: [{ email }, { username }],
    }).select("email username");

    if (existing) {
      const field = existing.email === email ? "email" : "username";
      return res.status(409).json({
        success: false,
        message: `Bu ${field} allaqachon band`,
      });
    }

    // role va wallet bu yerdan o'tkazilmaydi: role doim 'user',
    // wallet doim 0 (model defaultlari)
    const user = await User.create({ username, email, password });

    res.status(201).json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tdi",
      user: toPublicUser(user),
    });
  } catch (error) {
    // Yarishda paydo bo'lgan raqib so'rovi uchun ham (race condition)
    if (isDuplicateKeyError(error)) {
      const field = getDuplicateField(error) || "maydon";
      return res.status(409).json({
        success: false,
        message: `Bu ${field} allaqachon band`,
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || "Ro'yxatdan o'tishda xatolik yuz berdi",
    });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message:
          "JWT_SECRET .env faylida ko'rsatilmagan — .env.example ni ko'ring",
      });
    }

    const { email, password } = req.body;

    // password select: false bo'lgani uchun +password bilan olamiz
    const user = await User.findOne({ email }).select("+password");

    // Xabar birovning emaili yoki paroligini oshkor qilmasligi uchun
    // ikkala holatda ham bir xil javob qaytaramiz
    const invalidResponse = {
      success: false,
      message: "Email yoki parol noto'g'ri",
    };

    if (!user) {
      return res.status(401).json(invalidResponse);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json(invalidResponse);
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: "Tizimga muvaffaqiyatli kirdingiz",
      token,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Tizimga kirishda xatolik yuz berdi",
    });
  }
};
