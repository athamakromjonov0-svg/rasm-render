
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// Faqat rasm fayllari qabul qilinadi (pdf, exe va boshqalar rad etiladi)
const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
  ".bmp",
];

const ALLOWED_MIME_TYPES = ["image/"];

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
    const isAllowedMime = ALLOWED_MIME_TYPES.some((type) =>
      file.mimetype.startsWith(type)
    );

    if (!isAllowedExt || !isAllowedMime) {
      const error = new Error(
        "Faqat rasm fayli yuklash mumkin (jpg, jpeg, png, gif, webp, avif, svg, bmp)"
      );
      error.status = 400;
      return cb(error);
    }

    cb(null, true);
  },
});

module.exports = upload;
