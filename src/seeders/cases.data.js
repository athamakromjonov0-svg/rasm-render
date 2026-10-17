// Keshlar defitsiti: UI dagi 3 ta kesh va ularning ehtimollik guruhlari.
// Har bir guruh ulushi (share) mavjud skinlar soniga bo'linadi; agar biror
// guruhda skin bo'lmasa (masalan DB dan Rare o'chirilgan bo'lsa) uning ulushi
// qolgan guruhlarga nisbatan qayta taqsimlanadi — yig'indi doim 100% bo'ladi
// (Case model pre('validate') buni majburlaydi).

const CASE_DEFS = [
  {
    caseName: "Boshlang'ich kesh",
    casePrice: 100,
    groups: [
      { rarities: ["Common"], share: 70 },
      { rarities: ["Rare"], share: 25 },
      { rarities: ["Epic"], share: 5 },
    ],
  },
  {
    caseName: "Elita kesh",
    casePrice: 500,
    groups: [
      { rarities: ["Rare"], share: 50 },
      { rarities: ["Epic"], share: 35 },
      { rarities: ["Legendary"], share: 15 },
    ],
  },
  {
    caseName: "Mifologik kesh",
    casePrice: 1500,
    groups: [
      { rarities: ["Epic"], share: 60 },
      { rarities: ["Legendary"], share: 30 },
      { rarities: ["Mythic"], share: 10 },
    ],
  },
];

const round3 = (n) => Math.round(n * 1000) / 1000;

// Bitta guruh ulushini ichidagi skinlarga teng taqsimlash.
// Qoldiq oxirgi elementga beriladi, shu bilan yig'indi aynan share ga teng.
const splitShare = (groupSkins, share) => {
  const each = share / groupSkins.length;
  const entries = groupSkins.map((s) => ({ skin: s._id, chance: round3(each) }));
  const sum = entries.reduce((acc, e) => acc + e.chance, 0);
  const last = entries[entries.length - 1];
  last.chance = round3(last.chance + (share - sum));
  return entries;
};

// Skinlar ro'yxatidan Case hujjatlariga tayyor massiv quradi
const buildCases = (skins) => {
  const cases = [];

  for (const def of CASE_DEFS) {
    const groups = def.groups
      .map((g) => ({
        ...g,
        skins: skins.filter((s) => g.rarities.includes(s.skinRarity)),
      }))
      .filter((g) => g.skins.length > 0);

    if (groups.length === 0) continue; // bu keshga mos skin yo'q — o'tkazamiz

    // Ulushlarni 100 ga tenglashtiramiz (bo'sh guruhlar hisobga olingan holda)
    const totalShare = groups.reduce((acc, g) => acc + g.share, 0);
    let acc = 0;
    groups.forEach((g, idx) => {
      if (idx === groups.length - 1) {
        g.share = round3(100 - acc);
      } else {
        g.share = round3((g.share / totalShare) * 100);
        acc += g.share;
      }
    });

    cases.push({
      caseName: def.caseName,
      casePrice: def.casePrice,
      imageUrl: null,
      isAvailable: true,
      skins: groups.flatMap((g) => splitShare(g.skins, g.share)),
    });
  }

  return cases;
};

module.exports = { CASE_DEFS, buildCases };
