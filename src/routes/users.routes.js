const express = require("express");
const router = express.Router();

const validate = require("../middlewares/validate");
const authMiddleware = require("../middlewares/auth.middleware");
const { createUserSchema, updateUserSchema } = require("../validations/user.validation");

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  banUser,
  buySkin,
  sellSkin,
  deposit,
} = require("../controllers/users.controller");

// Barcha userlar
router.get("/", getAllUsers);

// Bitta user (yaroqsiz ID -> 400, topilmasa -> 404)
router.get("/:id", getUserById);

// User yaratish (Joi validatsiya: role/wallet o'tkazib bo'lmaydi)
router.post("/", validate(createUserSchema), createUser);

// User ni tahrirlash — faqat username, email, password
router.put("/:id", validate(updateUserSchema), updateUser);
router.patch("/:id", validate(updateUserSchema), updateUser);

// User ni o'chirish
router.delete("/:id", deleteUser);

// Ban / unban
router.patch("/:id/ban", banUser);

// Skin sotib olish / sotish
router.post("/:id/buy-skin", buySkin);
router.post("/:id/sell-skin", sellSkin);

// Demo uchun balans to'ldirish (faqat o'z hisobi yoki admin)
router.post("/:id/deposit", authMiddleware, deposit);

module.exports = router;
