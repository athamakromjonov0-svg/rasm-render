const mongoose = require("mongoose");

// Har bir kesh (case) ichidagi skin uchun tushish ehtimoli.
// Talab: skins elementlari yig'indisi aynan 100% bo'lishi kerak.
const caseItemSchema = new mongoose.Schema(
  {
    skin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skin",
      required: [true, "skin id kiritilishi shart"],
    },
    chance: {
      type: Number,
      required: [true, "chance kiritilishi shart"],
      min: [0, "chance 0 dan kichik bo'lmasligi kerak"],
      max: [100, "chance 100 dan katta bo'lmasligi kerak"],
    },
  },
  { _id: false }
);

const caseSchema = new mongoose.Schema(
  {
    caseName: {
      type: String,
      required: [true, "caseName maydoni kiritilishi shart"],
      trim: true,
      minlength: [2, "caseName kamida 2 ta belgidan iborat bo'lishi kerak"],
      maxlength: [100, "caseName ko'pi bilan 100 ta belgidan oshmasligi kerak"],
    },

    casePrice: {
      type: Number,
      required: [true, "casePrice maydoni kiritilishi shart"],
      min: [0.01, "casePrice noldan katta bo'lishi kerak"],
    },

    imageUrl: {
      type: String,
      trim: true,
      default: null,
    },

    // Bog'lanish: har bir element { skin: <Skin._id>, chance: <0..100> }
    skins: {
      type: [caseItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Kamida bitta skin bo'lishi kerak",
      },
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    versionKey: false,
  }
);

// Summa chegarasi: JS da 0.1 + 0.2 kabi xatolar uchun kichik og'ishga ruxsat
const CHANCE_EPSILON = 0.001;

// PROBABILITY CHECK: yig'indi aynan 100% bo'lishi kerak.
// pre('validate') create()/save() va .validate() da ishlaydi.
// Async hook: xato throw qilinadi (next emas) — Mongoose uni propagata qiladi.
caseSchema.pre("validate", async function () {
  if (!Array.isArray(this.skins) || this.skins.length === 0) {
    throw new Error("Kamida bitta skin bo'lishi kerak");
  }

  const total = this.skins.reduce((sum, item) => sum + (item.chance || 0), 0);

  if (Math.abs(total - 100) > CHANCE_EPSILON) {
    throw new Error(
      `Skin imkoniyatlari yig'indisi 100% bo'lishi kerak, hozir: ${total}`
    );
  }
});

const Case = mongoose.model("Case", caseSchema);

module.exports = Case;
