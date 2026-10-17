const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { getAllCases, getCaseById, openCase } = require("../controllers/cases.controller");

// Keyslar katalogi va bitta key — ochiq
router.get("/", getAllCases);
router.get("/:id", getCaseById);

// Kesh ochish — faqat tizimga kirgan foydalanuvchi (401)
router.post("/:id/open", authMiddleware, openCase);

module.exports = router;
