const mongoose = require("mongoose");

const Inventory = require("../models/inventory.model");
const User = require("../models/user.model");
const Transaction = require("../models/transaction.model");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const money = (n) => Math.round(Number(n) * 100) / 100;

// Sotilgan skin user.skins massividan faqat boshqa egallangan nusxa
// qolmagan bo'lig'ida olib tashlanadi (katalogdagi "Sizda bor" belgisi
// va Inventory tarixi bir xil javob bersin).
const otherOwnedCount = async (userId, skinId, excludeId) => {
  const filter = { user: userId, skin: skinId, status: "owned" };
  if (excludeId) filter._id = { $ne: excludeId };
  return Inventory.countDocuments(filter);
};

// GET /api/inventory — joriy foydalanuvchining inventari (auth talab)
// Query: status=owned|sold (standart: owned), page=1, limit=20
exports.getInventory = async (req, res) => {
  try {
    const status = ["owned", "sold"].includes(req.query.status)
      ? req.query.status
      : "owned";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = { user: req.user._id, status };

    const [items, count] = await Promise.all([
      Inventory.find(filter)
        .populate("skin")
        .populate("sourceCase")
        .sort({ obtainedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Inventory.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, count, page, limit, status, items });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Inventarni olishda xatolik: ${error.message}`,
    });
  }
};

// POST /api/inventory/:id/sell — skinni sotish, narxning 70% qaytadi (auth talab)
// id — INVENTORY yozuvi (Skin emas). Holat atomik o'zgaradi, shuning uchun
// ikki parallel so'rovda bir xil skinni ikki marta sotib bo'lmaydi.
exports.sellItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri ID format" });
    }

    const item = await Inventory.findById(id).populate("skin");

    if (!item) {
      return res.status(404).json({ success: false, message: "Inventar yozuvi topilmadi" });
    }

    // Chuzga tegish mumkin emas (adminga ruxsat)
    if (item.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bu inventar yozuvi sizga tegishli emas",
      });
    }

    if (!item.skin) {
      return res.status(409).json({ success: false, message: "Skin ma'lumoti topilmadi" });
    }

    const earn = money(item.skin.skinPrice * 0.7);

    // Avval yozuvni "owned -> sold" qilib "egallaymiz": kim birinchi
    // uddasidan chiqsa — shu sotadi, qolganlari 409 oladi.
    const claimed = await Inventory.findOneAndUpdate(
      { _id: item._id, status: "owned" },
      { $set: { status: "sold" } },
      { returnDocument: "after" }
    ).populate("skin");

    if (!claimed) {
      return res.status(409).json({ success: false, message: "Bu skin allaqachon sotilgan" });
    }

    const remainingOwned = await otherOwnedCount(item.user, item.skin._id, item._id);
    const update = { $inc: { wallet: earn } };
    if (remainingOwned === 0) update.$pull = { skins: item.skin._id };

    const updatedUser = await User.findOneAndUpdate(
      { _id: item.user },
      update,
      { returnDocument: "after" }
    );

    if (!updatedUser) {
      // Foydalanuvchi o'chirilgan — holatni qaytaramiz
      await Inventory.updateOne({ _id: item._id }, { $set: { status: "owned" } });
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    const balanceAfter = money(updatedUser.wallet);
    const balanceBefore = money(balanceAfter - earn);

    const transaction = await Transaction.create({
      user: item.user,
      type: "skin_sale",
      amount: earn,
      balanceBefore,
      balanceAfter,
    });

    res.status(200).json({
      success: true,
      message: "Skin sotildi",
      earned: earn,
      wallet: balanceAfter,
      skins: updatedUser.skins,
      item: claimed,
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
      message: `Skin sotishda xatolik: ${error.message}`,
    });
  }
};

// (Eski buy/sell bilan sinxroniya uchun ishlatiladigan yordamchi)
exports.markOwned = async (userId, skinId) => {
  const already = await otherOwnedCount(userId, skinId, null);
  if (already > 0) return null;
  return Inventory.create({ user: userId, skin: skinId, sourceCase: null, status: "owned" });
};

exports.markSold = async (userId, skinId) => {
  const remaining = await otherOwnedCount(userId, skinId, null);
  const claimed = await Inventory.findOneAndUpdate(
    { user: userId, skin: skinId, status: "owned" },
    { $set: { status: "sold" } },
    { returnDocument: "after", sort: { obtainedAt: -1 } }
  );
  return { claimed, remaining };
};
