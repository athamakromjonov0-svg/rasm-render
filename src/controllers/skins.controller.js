const mongoose = require('mongoose');
const fs = require('fs');

const Skin = require('../models/skins.model');
const { uploadToCloudinary } = require('../config/cloudinary');

// Yaroqsiz ID (masalan: "abc") → 400, aks holda MongoDB CastError bo‘lib 500 qaytar edi
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Barcha skinlarni olish
exports.getAllSkins = async (req, res) => {
    try {
        const skins = await Skin.find();
        res.status(200).json(skins);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching skins', error: error.message });
    }
};

// Bitta skinni ID orqali olish
exports.getSkinById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ message: "Noto'g'ri ID format" });
        }

        const skin = await Skin.findById(id);

        if (!skin) {
            return res.status(404).json({ message: "Skin topilmadi" });
        }

        res.status(200).json(skin);
    } catch (error) {
        res.status(500).json({ message: "Error fetching skin", error: error.message });
    }
};

// Yangi skin yaratish (ixtiyoriy rasm bilan)
exports.createSkin = async (req, res) => {
    try {
        const skinData = { ...req.body };

        // Rasm yuklangan bo'lsa, Cloudinaryga o'tkazamiz va URL ni saqlaymiz
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.path);
                skinData.skinImage = result.url;
            } catch (uploadError) {
                console.error("Skin yaratishda rasm yuklash xatosi:", uploadError.message);
                // Agar xato bo‘lsa — qayta ishlashni to‘xtatamiz
                return res.status(500).json({ message: "Rasm yuklashda xatolik yuz berdi" });
            }
        }

        const newSkin = new Skin(skinData);
        const savedSkin = await newSkin.save();
        res.status(201).json(savedSkin);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Skinni tahrirlash (update) - rasm ham almashishi mumkin
exports.updateSkin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            // Yaroqsiz ID kelsa ham yangi fayl diskda qolmasin
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
            return res.status(400).json({ message: "Noto'g'ri ID format" });
        }

        const existingSkin = await Skin.findById(id);

        if (!existingSkin) {
            // Yangi faylni ham o'chiramiz, chunki u hech kimga bog'lanmadi
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
            return res.status(404).json({ message: "Skin topilmadi" });
        }

        const updateData = { ...req.body };
        const hasNewImage = Boolean(req.file);

        // Yangi rasm keldi → Cloudinaryga yuklash va URL ni saqlash
        if (hasNewImage) {
            try {
                const result = await uploadToCloudinary(req.file.path);
                updateData.skinImage = result.url;
            } catch (uploadError) {
                console.error("Skin yangilashda rasm yuklash xatosi:", uploadError.message);
                return res.status(500).json({ message: "Rasm yuklashda xatolik yuz berdi" });
            }
        }

        const updatedSkin = await Skin.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        res.status(200).json(updatedSkin);
    } catch (error) {
        // Yangilashda xatolik → yangi faylni ortiqcha qoldirmaymiz
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        res.status(400).json({ message: error.message });
    }
};

// Skinni o'chirish
exports.deleteSkin = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ message: "Noto'g'ri ID format" });
        }

        const deletedSkin = await Skin.findByIdAndDelete(id);

        if (!deletedSkin) {
            return res.status(404).json({ message: "Skin topilmadi" });
        }

        res.status(200).json({ message: "Skin o'chirildi" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting skin", error: error.message });
    }
};