// Cloudinary sozlamalari
// .env da CLOUDINARY_* sozlamalari bo'lishi shart

const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Cloudinary sozlamalari .env dan olindi
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Rasmni Cloudinaryga yuklash
const uploadToCloudinary = async (localFilePath) => {
  try {
    // Fayl mavjudligini tekshirish
    if (!fs.existsSync(localFilePath)) {
      throw new Error("Fayl topilmadi: " + localFilePath);
    }

    // Cloudinaryga yuklash (resource_type: auto — formatni avtomatik aniqlaydi)
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      // O'zingizning folder va tambahlarni qo'shish mumkin:
      // folder: "cs2-skinmarket",
      // public_id: ...
    });

    // Faylni mahalliy diskdan o'chiramiz (Cloudinaryga o'tkazildikdan keyin)
    fs.unlinkSync(localFilePath);

    // URL va public_id ni qaytarish
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    // Faylni o'chirishga harakat qiling (xato bo'lsa ham)
    try {
      fs.unlinkSync(localFilePath);
    } catch {}

    throw error;
  }
};

module.exports = { cloudinary, uploadToCloudinary };
