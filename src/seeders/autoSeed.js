// Auto-seed: DB ulanganda skinlar va keshlar bo'sh bo'lsa —
// server o'zi 10 ta skin va 3 ta kesh yaratadi.
// Render'da hech qachon `npm run seed` ishlatilmagani uchun katalog bo'sh
// ko'rinardi — endi birinchi deployda ma'lumotlar avtomatik paydo bo'ladi.
// Agar DB'da allaqachon skinlar bo'lsa hech narsa o'zgartirilmaydi.

const Skin = require('../models/skins.model');
const Case = require('../models/case.model');
const skinsData = require('./skins.data');
const { buildCases } = require('./cases.data');

const autoSeed = async () => {
  try {
    const skinCount = await Skin.countDocuments();
    if (skinCount > 0) {
      return; // Katalog to'ldirilgan — aralashmaymiz
    }

    console.log('Auto-seed: DB bo\'sh — 10 ta skin yaratilayotir...');
    const createdSkins = await Skin.insertMany(skinsData);

    // Keshlar eski skin havolalari bilan qoldirilmasin: bo'sh bo'lsa (re)yaratamiz
    const caseCount = await Case.countDocuments();
    if (caseCount === 0) {
      const caseDocs = buildCases(createdSkins);
      if (caseDocs.length) {
        const createdCases = await Case.insertMany(caseDocs);
        console.log(`Auto-seed: ${createdCases.length} ta kesh yaratildi.`);
      }
    }

    console.log(`Auto-seed: ${createdSkins.length} ta skin katalogga qo'shildi.`);
  } catch (error) {
    // Auto-seed xatosi serverni o'ldirmasligi kerak — log qilib o'tamiz
    console.error('Auto-seed xatosi (server ishlab turadi):', error.message);
  }
};

module.exports = autoSeed;
