const mongoose = require("mongoose");

// Pul operatsiyalari tarixi (audit).
// Har bir operatsiyadan OLDIN va KEYINGI balans saqlanadi,
// shunda har qanday buzilishni (masalan, parallel buy) keyin tekshirish mumkin.

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user id kiritilishi shart"],
    },

    type: {
      type: String,
      enum: {
        values: ["deposit", "case_open", "skin_sale"],
        message:
          "type faqat 'deposit', 'case_open' yoki 'skin_sale' bo'lishi mumkin",
      },
      required: [true, "type maydoni kiritilishi shart"],
    },

    // Operatsiya summasi (doimiy qiymat, yo'nalish type dan ma'lum):
    // deposit / skin_sale -> +, case_open -> -
    amount: {
      type: Number,
      required: [true, "amount maydoni kiritilishi shart"],
      min: [0.01, "amount kamida 0.01 bo'lishi kerak"],
    },

    balanceBefore: {
      type: Number,
      required: [true, "balanceBefore kiritilishi shart"],
      min: [0, "balanceBefore manfiy bo'lishi mumkin emas"],
    },

    balanceAfter: {
      type: Number,
      required: [true, "balanceAfter kiritilishi shart"],
      min: [0, "balanceAfter manfiy bo'lishi mumkin emas"],
    },

    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true, // tarix o'zgartirib bo'lmaydi
    },
  },
  {
    versionKey: false,
  }
);

// Yo'nalish tekshiruvi: balans o'zgarishi type ga mos bo'lishi kerak.
// (Soniq xatolarni ham ushlaydi: maslan, case_open da balans oshib ketgan bo'lsa)
transactionSchema.pre("validate", async function () {
  const diff = this.balanceAfter - this.balanceBefore;

  if (this.type === "case_open" && diff > 0) {
    throw new Error(
      "case_open da balans kamayishi kerak (balanceAfter < balanceBefore)"
    );
  }

  if ((this.type === "deposit" || this.type === "skin_sale") && diff < 0) {
    throw new Error(
      `${this.type} da balans oshishi kerak (balanceAfter > balanceBefore)`
    );
  }

  if (toCents(Math.abs(diff)) !== toCents(this.amount)) {
    throw new Error(
      `amount balance farqiga mos kelmaydi: amount=${this.amount}, farq=${diff}`
    );
  }
});

// Pul qiymatlari 2 xonagacha aniqlikda saqlanadi, lekin JS da 1000.15 kabi
// sonlar aniq ifodalanmaydi: (15892.01 - 100) - 15892.01 ni tekshirganda
// 1e-12 darajasidagi og'ish paydo bo'ladi va qat'iy !== solish noxato
// xato beradi. Shuning uchun FARQNI va amountni tiqin (cent) aniqligida
// solishtiramiz — mantiq kuchli qoladi: farq yana ham 0.01 dan katta
// bo'lsa, xato utadi.
const toCents = (n) => Math.round(Number(n) * 100) / 100;

// Tarix ko'rish uchun indeks
transactionSchema.index({ user: 1, createdAt: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
