
const { uploadToCloudinary } = require("../config/cloudinary");

const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Fayl yuborilmadi",
    });
  }

  try {
    // Rasmni Cloudinaryga yuklash
    const result = await uploadToCloudinary(req.file.path);

    res.status(200).json({
      message: "Fayl muvaffaqiyatli yuklandi",
      file: {
        url: result.url,
        public_id: result.public_id,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Cloudinary yuklash xatosi:", error.message);
    res.status(500).json({
      message: "Faylni yuklashda xatolik yuz berdi",
    });
  }
};

module.exports = { uploadFile };
