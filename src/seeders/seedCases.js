// Keshlarni bazaga yuklash (skinlarga tegmaydi — faqat Case kolleksiyasini
// yangilaydi). Ishlatish: npm run seed:cases
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();

const mongoose = require('mongoose');
const Skin = require('../models/skins.model');
const Case = require('../models/case.model');
const { CASE_DEFS, buildCases } = require('./cases.data');

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    const skins = await Skin.find({});
    if (skins.length === 0) {
      console.error("Skin yo'q — avval `npm run seed` bajarin.");
      await mongoose.disconnect();
      process.exit(1);
    }

    const skinById = new Map(skins.map((s) => [String(s._id), s]));
    const docs = buildCases(skins);

    if (docs.length === 0) {
      console.error('Skinlar tarkibi keshlarga mos kelmaydi (rarity yo\'q).');
      await mongoose.disconnect();
      process.exit(1);
    }

    const names = CASE_DEFS.map((d) => d.caseName);
    await Case.deleteMany({ caseName: { $in: names } });
    const created = await Case.insertMany(docs);

    console.log(`Yaratildi: ${created.length} ta kesh`);
    created.forEach((c) => {
      console.log(`\n[${c.caseName}] narx: ${c.casePrice} $`);
      c.skins.forEach((item) => {
        const skin = skinById.get(String(item.skin));
        console.log(`  ${item.chance}% — [${skin ? skin.skinRarity : '?'}] ${skin ? skin.skinName : item.skin}`);
      });
      const total = c.skins.reduce((acc, i) => acc + i.chance, 0);
      console.log(`  yig'indi: ${total}%`);
    });

    await mongoose.disconnect();
    console.log('\nMongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Seed case error:', error);
    process.exit(1);
  }
};

run();
