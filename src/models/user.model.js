const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// NOTA: unique: true — bu validatsiya EMAS, bu MongoDB indeksi.
// Dublikatda MongoDB E11000 xatosini qaytaradi, uni controllerda
// 409 (Conflict) ga aylantiramiz (src/utils/dbErrors.js).

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "username maydoni kiritilishi shart"],
      unique: true,
      trim: true,
      minlength: [3, "username kamida 3 ta belgidan iborat bo'lishi kerak"],
      maxlength: [30, "username ko'pi bilan 30 ta belgidan oshmasligi kerak"],
    },

    email: {
      type: String,
      required: [true, "email maydoni kiritilishi shart"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "email noto'g'ri formatda"],
    },

    // Parol hech qachon oddiy matn ko'rinishida saqlanmaydi.
    // select: false — standart so'rovlarda (find/findOne) parol qaytmasin;
    // login da .select("+password") bilan olinadi.
    password: {
      type: String,
      required: [true, "password maydoni kiritilishi shart"],
      minlength: [6, "password kamida 6 ta belgidan iborat bo'lishi kerak"],
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "role faqat 'user' yoki 'admin' bo'lishi mumkin",
      },
      default: "user",
    },

    wallet: {
      type: Number,
      default: 0,
      min: [0, "wallet manfiy bo'lishi mumkin emas"],
    },

    // === Avvalgi darslardan qolgan maydonlar (mavjud funksiyalar uchun) ===
    isBanned: {
      type: Boolean,
      default: false,
    },
    // Sotib olingan skinlar (kelajakda Inventory modeli o'rnini oladi)
    skins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Skin",
      },
    ],
  },
  {
    timestamps: true, // createdAt / updatedAt
    versionKey: false,
  }
);

const SALT_ROUNDS = 10;

// Parolni save() dan oldin avtomatik hash qilish.
// Ro'yxatdan o'tish ham, boshqa yaratish yo'llari ham shu qoidaga bo'ysunadi —
// hech qanday controller xom parolni saqlashni unuta olmaydi.
// ESLATMA: async hook'larda next chaqirilmaydi — xato throw qilsa,
// Mongoose uni promise sifatida yuqoriga uzatadi.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// findByIdAndUpdate / updateMany kabi update- yo'llari pre('save') ni ishlatmaydi,
// shuning uchun update hook ham qo'shamiz (password yangilansa hash bo'lsin).
userSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate() || {};

  if (typeof update.password === "string") {
    update.password = await bcrypt.hash(update.password, SALT_ROUNDS);
  } else if (update.$set && typeof update.$set.password === "string") {
    update.$set.password = await bcrypt.hash(update.$set.password, SALT_ROUNDS);
  }
});

// Parol hech qachon API javobiga tushmasin (ham toJSON, ham toObject uchun)
const stripPassword = (doc, ret) => {
  delete ret.password;
  return ret;
};

userSchema.set("toJSON", { transform: stripPassword });
userSchema.set("toObject", { transform: stripPassword });

module.exports = mongoose.model("User", userSchema);
