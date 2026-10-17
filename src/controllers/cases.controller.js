const mongoose = require("mongoose");

const Case = require("../models/case.model");
const User = require("../models/user.model");
const Inventory = require("../models/inventory.model");
const Transaction = require("../models/transaction.model");

// Yaroqsiz ID -> 400 (aks holda MongoDB CastError 500 qaytarardi)
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Pul qiymatlarini 2 xonagacha yaxlitlash (0.1 + 0.2 kabi xatolarga qarshi)
const money = (n) => Math.round(Number(n) * 100) / 100;

// chance bo'yicha vaznli tanlov: yig'indi 100 bo'lmasa ham to'g'ri ishlaydi
// (oxirgi element qolgan ehtimollikni oladi — roll hech qachon tashqariga chiqmaydi)
const pickByChance = (items) => {
  const total = items.reduce((sum, i) => sum + (Number(i.chance) || 0), 0);
  if (total <= 0) return items[items.length - 1];

  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Number(item.chance) || 0;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
};

// GET /api/cases — keshlar katalogi (ochiq)
exports.getAllCases = async (req, res) => {
  try {
    const cases = await Case.find({}).populate("skins.skin");
    res.status(200).json({ success: true, cases });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Keyslarni olishda xatolik: ${error.message}`,
    });
  }
};

// GET /api/cases/:id — bitta kesh (ochiq)
exports.getCaseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri kesh ID format" });
    }

    const singleCase = await Case.findById(id).populate("skins.skin");

    if (!singleCase) {
      return res.status(404).json({ success: false, message: "Kesh topilmadi" });
    }

    res.status(200).json({ success: true, case: singleCase });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Keshni olishda xatolik: ${error.message}`,
    });
  }
};

// POST /api/cases/:id/open — kesh ochish (auth talab qilinadi)
// Tartib muhim: 1) keshni tekshirish -> 2) vaznli tanlov -> 3) pulni atomik
// yechish (parallel so'rovlarda balans minusga tushmasligi uchun) ->
// 4) Inventory + Transaction yozuvlari. Agar 4-bosqichda xato chiqsa —
// pul qaytariladi (tejashsiz qolmaydi).
exports.openCase = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri kesh ID format" });
    }

    const caseDoc = await Case.findById(id).populate("skins.skin");

    if (!caseDoc) {
      return res.status(404).json({ success: false, message: "Kesh topilmadi" });
    }

    if (!caseDoc.isAvailable) {
      return res.status(409).json({
        success: false,
        message: "Bu kesh hozircha ochib bo'lmaydi",
      });
    }

    const items = (caseDoc.skins || []).filter((i) => i && i.skin);
    if (items.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Kesh ichida sotuvda turgan skin yo'q",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Foydalanuvchi topilmadi" });
    }
    if (user.isBanned) {
      return res.status(403).json({ success: false, message: "Banned userlar kesh ocholmaydi" });
    }

    const price = money(caseDoc.casePrice);

    if (user.wallet < price) {
      return res.status(400).json({
        success: false,
        message: `Balans yetarli emas. Kerak: ${price} $, sizda: ${money(user.wallet)} $`,
      });
    }

    // 1) Ehtimollik bo'yicha skin tanlanadi
    const dropped = pickByChance(items).skin;

    // 2) Pulni ATOMIK ravishda yechamiz: shu so'rovda balans hali ham
    //    yetarli bo'lsaigina update bajariladi (parallel ochishda xavfsiz).
    const deducted = await User.findOneAndUpdate(
      { _id: user._id, isBanned: false, wallet: { $gte: price } },
      { $inc: { wallet: -price }, $addToSet: { skins: dropped._id } },
      { returnDocument: "after" }
    );

    if (!deducted) {
      const fresh = await User.findById(user._id);
      if (!fresh) {
        return res.status(401).json({ success: false, message: "Foydalanuvchi topilmadi" });
      }
      if (fresh.isBanned) {
        return res.status(403).json({ success: false, message: "Banned userlar kesh ocholmaydi" });
      }
      return res.status(400).json({
        success: false,
        message: `Balans yetarli emas. Kerak: ${price} $, sizda: ${money(fresh.wallet)} $`,
      });
    }

    const balanceAfter = money(deducted.wallet);
    const balanceBefore = money(balanceAfter + price);

    let droppedItem;
    let transaction;
    try {
      droppedItem = await Inventory.create({
        user: user._id,
        skin: dropped._id,
        sourceCase: caseDoc._id,
        status: "owned",
      });

      transaction = await Transaction.create({
        user: user._id,
        type: "case_open",
        amount: price,
        balanceBefore,
        balanceAfter,
      });
    } catch (writeError) {
      // Yozuv yaratilmadi — yechilgan pulni qaytaramiz
      await User.updateOne({ _id: user._id }, { $inc: { wallet: price }, $pull: { skins: dropped._id } });
      return res.status(500).json({
        success: false,
        message: `Kesh ochish bajarilmadi, pul qaytarildi: ${writeError.message}`,
      });
    }

    await droppedItem.populate("skin");

    res.status(200).json({
      success: true,
      message: "Kesh ochildi",
      dropped: droppedItem,
      wallet: balanceAfter,
      skins: deducted.skins,
      transaction: {
        type: transaction.type,
        amount: transaction.amount,
        balanceBefore: transaction.balanceBefore,
        balanceAfter: transaction.balanceAfter,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Kesh ochishda xatolik: ${error.message}`,
    });
  }
};
