const mongoose = require("mongoose");

// JSON chiqishda fayl nomini to'liq yo'lga aylantirish:
// Hozir Cloudinary URL lar ishlatiladi, shuning uchun o'zgarish shart emas.
// Lekin eski fayl nomlari ham holatda bo'lishi mumkin — ularni /uploads/ prefiksi bilan to'ldiramiz.
const toFullImagePath = (doc, ret) => {
  if (ret.skinImage && !ret.skinImage.startsWith("/") && !ret.skinImage.startsWith("http")) {
    ret.skinImage = `/uploads/${ret.skinImage}`;
  }
  return ret;
};

const skinSchema = new mongoose.Schema(
  {
    skinName: {
      type: String,
      required: true,
      trim: true,
    },
    skinRarity: {
      type: String,
      required: true,
      enum: ["Common", "Rare", "Epic", "Legendary", "Mythic"],
    },
    skinPrice: {
      type: Number,
      required: true,
      min: 0.01,
    },
    // Hozir Cloudinary URL saqlanadi (masalan: https://res.cloudinary.com/.../image/upload/...)
    // Lekin eski ma'lumotlarda faqat fayl nomini ham bo'lishi mumkin.
    skinImage: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// res.json() chaqirilganda (toJSON) transform ishlaydi
skinSchema.set("toJSON", { transform: toFullImagePath });
skinSchema.set("toObject", { transform: toFullImagePath });

const Skin = mongoose.model("Skin", skinSchema);

module.exports = Skin;
