const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const Skin = require('../models/skins.model');
const User = require('../models/user.model');
const Case = require('../models/case.model');
const { buildCases } = require('./cases.data');
const skinsData = require('./skins.data');

const seedDatabase = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully!");

    console.log("Clearing existing skins...");
    // Keshlar eski skin id lariga bog'langan — ularni ham tozalaymiz,
    // aks holda yangi skinlar ustida eskirgan havolalar qolardi.
    await Case.deleteMany({});
    await Skin.deleteMany({});

    console.log("Inserting 10 skins...");
    const createdSkins = await Skin.insertMany(skinsData);

    // Keshlar (3 ta) — ehtimolliklar yig'indisi aynan 100%
    const caseDocs = buildCases(createdSkins);
    const createdCases = caseDocs.length ? await Case.insertMany(caseDocs) : [];
    console.log(`Inserted ${createdCases.length} cases:`);
    createdCases.forEach((c) => {
      const total = c.skins.reduce((acc, i) => acc + i.chance, 0);
      console.log(`- ${c.caseName} (${c.casePrice} $) — ${c.skins.length} ta skin, yig'indi ${total}%`);
    });

    console.log(`Successfully seeded ${createdSkins.length} skins into MongoDB:`);
    createdSkins.forEach((skin, index) => {
      console.log(`${index + 1}. [${skin.skinRarity}] ${skin.skinName} - $${skin.skinPrice}`);
    });

    // =====================
    // Ixtiyoriy: admin yaratish
    // ADMIN_EMAIL va ADMIN_PASSWORD .env da bo'lsa, admin foydalanuvchi
    // yaratiladi (parol model hookida bcrypt bilan hash qilinadi).
    // Misol:
    //   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=changeme npm run seed
    // =====================
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      try {
        const adminEmail = process.env.ADMIN_EMAIL.toLowerCase();
        const adminUsername =
          process.env.ADMIN_USERNAME || `${adminEmail.split('@')[0]}_admin`;

        let admin = await User.findOne({ email: adminEmail });

        if (!admin) {
          admin = await User.create({
            username: adminUsername,
            email: adminEmail,
            password: process.env.ADMIN_PASSWORD,
            role: 'admin',
            wallet: 1000,
          });
          console.log(`Admin created: ${admin.email} (role: ${admin.role})`);
        } else if (admin.role !== 'admin') {
          admin.role = 'admin';
          await admin.save();
          console.log(`User promoted to admin: ${admin.email}`);
        } else {
          console.log(`Admin already exists: ${admin.email}`);
        }
      } catch (adminError) {
        if (adminError.code === 11000) {
          console.error('Admin yaratilmadi: email yoki username band');
        } else {
          console.error('Admin yaratishda xatolik:', adminError.message);
        }
      }
    } else {
      console.log(
        'ADMIN_EMAIL/ADMIN_PASSWORD kiritilmadi — admin yaratilmadi (ixtiyoriy).'
      );
    }

    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedDatabase();
