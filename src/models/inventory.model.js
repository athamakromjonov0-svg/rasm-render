const mongoose = require("mongoose");

// NIMA UCHUN HAR BIR OLINGAN SKIN ALOHIDA HUJJAT?
// -----------------------------------------------
// 1) user.skins = ["AK-47 | Redline"] (faqat nomlar yoki bitta massiv) da
//    bir xil skin necha marta tushgani, qachon olingani va qaysi keshdan
//    kelgani SAQLANMAYDI. Custom-jozibadorlik yo'qoladi.
// 2) "Sotildi" holatini alohida belgilab bo'lmaydi: sotilgan skin ham
//    user massivida qolaveradi yoki o'chiriladi — tarix yo'qoladi.
// 3) Har bir instance alohida hujjat bo'lgani uchun uni mustaqil
//    yangilash (owned -> sold), indekslash va filter qilish mumkin:
//    "user X ning sotilmagan skinlari" — bitta so'rov bilan.
// 4) Bir xil skin turg'un ravishda bir necha marta tushishi mumkin
//    (kesh ochilganda) — massivda bu yo'qolardi yoki dublikatga aylanardi.
//
// Xulosa: massivda faqat "hozir nimasi bor" saqlanadi, Inventory esa
// "qachon, qayerdan oldi, holati nima" degan to'liq tarixni saqlaydi.

const inventorySchema = new mongoose.Schema(
  {
    // Kimda (foydalanuvchi)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user id kiritilishi shart"],
    },

    // Nima (skin) — Skin kolleksiyasiga havola
    skin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skin",
      required: [true, "skin id kiritilishi shart"],
    },

    // Qaysi keshdan oldi (agar kesh orqali olingan bo'lsa).
    // Optional: kelajakda boshqa manbalar (buy, reward) ham bo'lishi mumkin.
    sourceCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      default: null,
    },

    // Holati: sotilmagan (owned) yoki sotilgan (sold)
    status: {
      type: String,
      enum: {
        values: ["owned", "sold"],
        message: "status faqat 'owned' yoki 'sold' bo'lishi kerak",
      },
      default: "owned",
      index: true,
    },

    // Qachon olindi
    obtainedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

// Tez-tez so'raladigan so'rovlar uchun indekslar:
// "shu user ning sotilmagan skinlari"
inventorySchema.index({ user: 1, status: 1 });

const Inventory = mongoose.model("Inventory", inventorySchema);

module.exports = Inventory;
