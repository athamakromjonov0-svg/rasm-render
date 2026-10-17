const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { getWallet } = require("../controllers/wallet.controller");

// Hamyon balansi + oxirgi operatsiyalar tarixi (faqat o'z hisobi)
router.get("/", authMiddleware, getWallet);

module.exports = router;
