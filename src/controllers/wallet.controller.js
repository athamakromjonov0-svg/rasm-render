const User = require("../models/user.model");
const Transaction = require("../models/transaction.model");

// GET /api/wallet?limit=10 — joriy foydalanuvchining balansi va operatsiya tarixi
exports.getWallet = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    const transactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      wallet: user.wallet,
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Hamyonni olishda xatolik: ${error.message}`,
    });
  }
};
