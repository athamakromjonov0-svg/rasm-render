const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { getInventory, sellItem } = require("../controllers/inventory.controller");

// Ikkalasi ham faqat tizimga kirgan foydalanuvchi uchun (401)
router.get("/", authMiddleware, getInventory);
router.post("/:id/sell", authMiddleware, sellItem);

module.exports = router;
