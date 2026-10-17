const jwt = require("jsonwebtoken");

const User = require("../models/user.model");

// Authorization: Bearer <token>
// Tokenni tekshiradi va req.user ga TEKSHIRILGAN foydalanuvchini qo'yadi.
// Rol doim DBdan olinadi — client yuborgan qiymatga ishonilmaydi.
const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message:
          "Token topilmadi. 'Authorization: Bearer <token>' sarlavhasini qo'shing",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message:
          "JWT_SECRET .env faylida ko'rsatilmagan — .env.example ni ko'ring",
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token yaroqsiz yoki muddati o'tgan",
      });
    }

    // Token yaratilganidan keyin o'chirilgan user ham kira olmasligi uchun
    // yozuvni DBdan qayta olamiz (password select: false — kelmaydi)
    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Foydalanuvchi topilmadi yoki hisob o'chirilgan",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;
