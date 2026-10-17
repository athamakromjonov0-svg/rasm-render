const mongoose = require("mongoose");

const User = require("../models/user.model");
const Skin = require("../models/skins.model");
const Transaction = require("../models/transaction.model");
const Inventory = require("../models/inventory.model");
const { isDuplicateKeyError, getDuplicateField } = require("../utils/dbErrors");

// Yaroqsiz ID (masalan: "abc") -> 400, aks holda MongoDB CastError bo'lib
// 500 qaytar edi
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Pul qiymatlarini 2 xonagacha yaxlitlash
const money = (n) => Math.round(Number(n) * 100) / 100;

// ============================================================
// CRUD (homework: GET list, GET by id, PATCH, DELETE + POST)
// Javoblar hech qachon password qaytarmaydi:
// 1) modelda password select: false, 2) toJSON transform o'chiradi.
// ============================================================

// GET /api/users — ro'yxat
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("skins");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

// GET /api/users/:id — bitta user
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Noto'g'ri ID format" });
    }

    const user = await User.findById(id).populate("skins");

    if (!user) {
      return res.status(404).json({ message: "User topilmadi" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error: error.message });
  }
};

// POST /api/users — yaratish (role/wallet o'zgartirib bo'lmaydi — Joi stripUnknown)
exports.createUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const newUser = new User({ username, email, password });
    const savedUser = await newUser.save(); // password pre('save') da hash qilinadi

    res.status(201).json(savedUser);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const field = getDuplicateField(error) || "maydon";
      return res.status(409).json({
        message: `Bu ${field} allaqachon band`,
      });
    }
    res.status(400).json({ message: error.message });
  }
};

// PATCH /api/users/:id — faqat username, email, password o'zgarishi mumkin
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Noto'g'ri ID format" });
    }

    // role, wallet, isBanned, skins — CRUD orqali o'zgartirib bo'lmaydi
    // (Joi stripUnknown ham qirqadi, bu yerdagi destrukturizatsiya — ikkinchi qatlam)
    const { role, wallet, isBanned, skins, ...updateData } = req.body;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("skins");

    if (!updatedUser) {
      return res.status(404).json({ message: "User topilmadi" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const field = getDuplicateField(error) || "maydon";
      return res.status(409).json({
        message: `Bu ${field} allaqachon band`,
      });
    }
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Noto'g'ri ID format" });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User topilmadi" });
    }

    res.status(200).json({ message: "User o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};

// ============================================================
// Avvalgi darslardan qolgan endpointlar (wallet bilan ishlaydi)
// ============================================================

// PATCH /api/users/:id/ban — ban / unban (toggle)
exports.banUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Noto'g'ri ID format" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User topilmadi" });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.status(200).json({
      message: user.isBanned
        ? `${user.username} useri banlandi`
        : `${user.username} useri bandan chiqarildi`,
      isBanned: user.isBanned,
    });
  } catch (error) {
    res.status(500).json({ message: "Error banning user", error: error.message });
  }
};

// POST /api/users/:id/deposit — demo uchun balans to'ldirish
// Body: { "amount": 100 }
// Faqat o'zingiz yoki admin: auth middleware req.user ni to'ldiradi.
// Har bir amal uchun Transaction yoziladi (type: deposit).
exports.deposit = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Noto'g'ri user ID format" });
    }

    // Boshqa user hisobiga pul tashlab bo'lmaydi (admin mumkin)
    if (
      !req.user ||
      (req.user._id.toString() !== id && req.user.role !== "admin")
    ) {
      return res.status(403).json({
        message: "Faqat o'zingizning hisobingizni to'ldirishingiz mumkin",
      });
    }

    const amount = Math.round(Number(req.body && req.body.amount) * 100) / 100;

    if (!Number.isFinite(amount) || amount < 0.01 || amount > 10000) {
      return res.status(400).json({
        message: "amount 0.01 dan 10000 gacha bo'lishi kerak",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User topilmadi" });
    }

    const balanceBefore = user.wallet;
    const balanceAfter = Math.round((balanceBefore + amount) * 100) / 100;

    // Avval transaction yozamiz (balans o'zgarishi mos kelishi shart),
    // keyin walletni yangilaymiz
    const transaction = await Transaction.create({
      user: user._id,
      type: "deposit",
      amount,
      balanceBefore,
      balanceAfter,
    });

    user.wallet = balanceAfter;
    await user.save();

    res.status(200).json({
      message: `${amount} ta para hisobingizga qo'shildi`,
      wallet: user.wallet,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: "Error depositing", error: error.message });
  }
};

// POST /api/users/:id/buy-skin — Body: { "skinId": "..." }
exports.buySkin = async (req, res) => {
  try {
    const { skinId } = req.body;

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Noto'g'ri user ID format" });
    }

    if (!skinId) {
      return res.status(400).json({ message: "skinId kiritilishi shart" });
    }

    if (!isValidId(skinId)) {
      return res.status(400).json({ message: "skinId noto'g'ri formatda" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User topilmadi" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Banned userlar skin sotib ololmaydi" });
    }

    const skin = await Skin.findById(skinId);

    if (!skin) {
      return res.status(404).json({ message: "Skin topilmadi" });
    }

    // Bir xil skinni ikki marta sotib olish mumkin emas
    if (user.skins.some((id) => id.toString() === skinId)) {
      return res.status(400).json({ message: "Bu skin sizda allaqachon bor" });
    }

    if (user.wallet < skin.skinPrice) {
      return res.status(400).json({
        message: `Balans yetarli emas. Kerak: ${skin.skinPrice}, sizda: ${user.wallet}`,
      });
    }

    user.wallet = money(user.wallet - skin.skinPrice);
    user.skins.push(skin._id);
    await user.save();

    // Inventarda ham yozuv qoldiramiz — keshdan tushganlar bilan bir tizimda
    // bo'lsin. Agar yozuv yaratilmasa — sotib olishni bekor qilib, pulni
    // qaytaramiz (yarmi-holat qolmasligi uchun).
    try {
      const ownedCount = await Inventory.countDocuments({
        user: user._id,
        skin: skin._id,
        status: "owned",
      });
      if (ownedCount === 0) {
        await Inventory.create({
          user: user._id,
          skin: skin._id,
          sourceCase: null,
          status: "owned",
        });
      }
    } catch (invError) {
      user.wallet = money(user.wallet + skin.skinPrice);
      user.skins = user.skins.filter((sid) => sid.toString() !== skinId);
      await user.save();
      return res.status(500).json({
        message: `Sotib olish bekor qilindi (inventar yozuvi yaratilmadi): ${invError.message}`,
      });
    }

    const populatedUser = await user.populate("skins");

    res.status(200).json({
      message: `${skin.skinName} skini sotib olindi`,
      wallet: user.wallet,
      user: populatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Error buying skin", error: error.message });
  }
};

// POST /api/users/:id/sell-skin — Body: { "skinId": "..." }
exports.sellSkin = async (req, res) => {
  try {
    const { skinId } = req.body;

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Noto'g'ri user ID format" });
    }

    if (!skinId) {
      return res.status(400).json({ message: "skinId kiritilishi shart" });
    }

    if (!isValidId(skinId)) {
      return res.status(400).json({ message: "skinId noto'g'ri formatda" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User topilmadi" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Banned userlar skin sota olmaydi" });
    }

    // Bu skin userda bormi tekshiramiz
    const ownsSkin = user.skins.some((id) => id.toString() === skinId);

    if (!ownsSkin) {
      return res.status(400).json({ message: "Sizda bunday skin yo'q" });
    }

    const skin = await Skin.findById(skinId);

    if (!skin) {
      return res.status(404).json({ message: "Skin topilmadi" });
    }

    // Sotishda narxning 70% qaytadi
    const sellPrice = money(skin.skinPrice * 0.7);

    // Avval Inventory yozuvini "owned -> sold" qilib egallaymiz: parallel
    // so'rovlarda bir xil skin ikki marta sotilmasin. Eski yozuv bo'lmasa
    // ham sotish mumkin (legacy buy qilingan skinlar uchun).
    const claimed = await Inventory.findOneAndUpdate(
      { user: user._id, skin: skin._id, status: "owned" },
      { $set: { status: "sold" } },
      { returnDocument: "after", sort: { obtainedAt: -1 } }
    );

    const balanceBefore = money(user.wallet);
    const balanceAfter = money(balanceBefore + sellPrice);

    let transaction;
    try {
      transaction = await Transaction.create({
        user: user._id,
        type: "skin_sale",
        amount: sellPrice,
        balanceBefore,
        balanceAfter,
      });
    } catch (txError) {
      // Yozuv yaratilmadi — holatni qaytaramiz, pul olmaymiz
      if (claimed) {
        await Inventory.updateOne({ _id: claimed._id }, { $set: { status: "owned" } });
      }
      return res.status(500).json({
        message: `Sotish bekor qilindi: ${txError.message}`,
      });
    }

    user.wallet = balanceAfter;
    // user.skins faqat "kamida bitta egallangan nusxa" uchun: boshqa nusxa
    // qolgan bo'lsa, katalog belgisi ham inventar bilan mos qoladi.
    const otherOwned = await Inventory.countDocuments({
      user: user._id,
      skin: skin._id,
      status: "owned",
    });
    if (otherOwned === 0) {
      user.skins = user.skins.filter((id) => id.toString() !== skinId);
    }
    await user.save();

    const populatedUser = await user.populate("skins");

    res.status(200).json({
      message: `${skin.skinName} skini sotildi`,
      earned: sellPrice,
      wallet: user.wallet,
      user: populatedUser,
      transaction: {
        type: transaction.type,
        amount: transaction.amount,
        balanceBefore: transaction.balanceBefore,
        balanceAfter: transaction.balanceAfter,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error selling skin", error: error.message });
  }
};
