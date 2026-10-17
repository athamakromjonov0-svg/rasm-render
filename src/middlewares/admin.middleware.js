// Faqat admin uchun yo'llar uchun.
// Tartib: avval authMiddleware (req.user ni to'ldiradi), so'ng shu middleware.
//
// - Avval ro'yxatdan o'tmagan -> 401 (Unauthorized)
// - Lekin rol 'admin' emas -> 403 (Forbidden)
//
// Rol req.user dan olinadi — u authMiddleware da DBdan olingan
// tekshirilgan yozuv, client yuborgan qiymat emas.
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Avval tizimga kiring (token yuborilmagan)",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Ruxsat yo'q: bu amalni faqat admin bajarishi mumkin",
    });
  }

  next();
};

module.exports = adminMiddleware;
