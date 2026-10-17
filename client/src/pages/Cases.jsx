import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useApp, formatMoney } from "../store.jsx";
import { Loader, Empty, RarityBadge, SkinThumb, Modal, RARITIES } from "../ui.jsx";

const rarityColor = (name) => RARITIES[name]?.color || "#8a94ad";

// CS2 rarity nomlarining lotincha ko'rinishi (karta ustidagi ehtimollar matni)
const RARITY_UZ = {
  Common: "oddiy",
  Rare: "noyob",
  Epic: "epik",
  Legendary: "afsonaviy",
  Mythic: "mifologik",
};

const ROUTES = [
  "GET /api/cases",
  "POST /api/cases/:id/open",
  "GET /api/inventory",
  "POST /api/inventory/:id/sell",
  "GET /api/wallet",
];

// Modelda faqat caseName/casePrice bor — karta ko'rinishini narx bo'yicha belgilaymiz
// Keyslar tarixi: CS2 skin emaksa singari keys orqali ochiladi
const caseMeta = (c) => {
  if (c.casePrice <= 100)
    return {
      icon: "🎁",
      tier: "COMMON",
      tierRarity: "Common",
      desc: "Oddiy va noyob skinlar tushadi — boshlovchilar uchun.",
      keyStyle: "common",
    };
  if (c.casePrice <= 500)
    return {
      icon: "💎",
      tier: "EPIC",
      tierRarity: "Epic",
      desc: "Epik va afsonaviy skinlarga yo'l ochadi.",
      keyStyle: "epic",
    };
  return {
    icon: "🔥",
    tier: "MYTHIC",
    tierRarity: "Mythic",
    desc: "Mifologik skinlar tushadigan yagona yo'l.",
    keyStyle: "mythic",
  };
};

// Kesh ichidagi ehtimollarni rarity bo'yicha jamlaymiz:
// [{chance: 40, skin: {skinRarity: "Common"}}] -> "70% oddiy, 25% noyob, ..."
const chanceText = (c) => {
  const totals = {};
  (c.skins || []).forEach((i) => {
    const rarity = i.skin?.skinRarity;
    if (!rarity) return;
    totals[rarity] = (totals[rarity] || 0) + (Number(i.chance) || 0);
  });

  const parts = Object.keys(RARITY_UZ)
    .filter((r) => totals[r])
    .map((r) => `${Math.round(totals[r] * 100) / 100}% ${RARITY_UZ[r]}`);

  return parts.length ? parts.join(", ") : "Ehtimollar yuklanmoqda...";
};

export default function Cases() {
  const { user, setPage, toast, setUser } = useApp();
  const [cases, setCases] = useState(null); // null = yuklanmoqda
  const [busyId, setBusyId] = useState(null);
  const [drop, setDrop] = useState(null); // ochilgan natija
  const [rolling, setRolling] = useState(null); // aylantirish holati (keySpin)

  const load = useCallback(async () => {
    try {
      const d = await api("/api/cases");
      setCases(d.cases || []);
    } catch (e) {
      setCases([]);
      toast(e.message, "err");
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCase = async (c) => {
    if (!user) {
      setPage("auth");
      toast("Key ochish uchun avval tizimga kiring", "err");
      return;
    }

    setBusyId(c._id);
    // Kazino usulida key aylantirish animatsiyasi
    setRolling({ caseId: c._id, start: Date.now() });
    try {
      const d = await api(`/api/cases/${c._id}/open`, { method: "POST" });
      // Tanga yechildi + tushgan skin inventarga tushdi — holatni yangilaymiz
      setUser({ ...user, wallet: d.wallet, skins: d.skins ?? user.skins });
      setDrop({ caseName: c.caseName, ...d, caseId: c._id });
      toast(`Key ochildi!`, "ok");
    } catch (e) {
      if (e.status === 401) {
        setPage("auth");
        toast("Sessiya tugagan — qayta tizimga kiring", "err");
      } else {
        toast(e.message, "err");
      }
    } finally {
      setBusyId(null);
      setRolling(null);
    }
  };

  if (cases === null) return <Loader text="Keyslar yuklanmoqda..." />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">🔑 Keyslar</h1>
          <p className="muted">
          Key ochilganda narxi hisobingizdan yechiladi, tushgan skin
          inventaringizga tushadi — uni sotib 70% pulini qaytarib olasiz.
          </p>
        </div>
        <span className="status-pill">
          🪙 <b className="gold">{formatMoney(user ? user.wallet : 0)}</b>
        </span>
      </div>

      {cases.length === 0 ? (
        <Empty
          icon="📦"
          title="Keyslar topilmadi"
          text="Bazada keshlar yo'q — `npm run seed:cases` buyrug'i bilan yuklang"
          actionLabel="Qayta yuklash"
          onAction={load}
        />
      ) : (
        <div className="grid grid-3">
          {cases.map((c) => {
            const meta = caseMeta(c);
            const badgeRarity = meta.tierRarity;
            const tooExpensive = user && user.wallet < c.casePrice;
            const busy = busyId === c._id;
            return (
              <article
                key={c._id}
                className={`card case-card key-card ${meta.keyStyle}`}
                style={{ "--rarity": rarityColor(badgeRarity) }}
              >
                {/* Key top visual - split key shape */}
                <div className="key-visual">
                  <div className="key-head">
                    <span className="key-icon">{meta.icon}</span>
                    <span className="key-badge">{meta.tier}</span>
                  </div>
                  <div className="key-body">
                    <h3>{c.caseName}</h3>
                    <p className="muted small">{meta.desc}</p>
                  </div>
                </div>
                <div className="chance-line">
                  <span className="muted small">Tushish ehtimoli:</span>
                  <b>{chanceText(c)}</b>
                </div>
                <div className="case-bottom">
                  <span className="price">{formatMoney(c.casePrice)}</span>
                  <button
                    className="btn btn-primary key-open-btn"
                    disabled={busy || tooExpensive}
                    onClick={() => openCase(c)}
                    title={tooExpensive ? "Balans yetarli emas" : undefined}
                  >
                    {busy
                      ? "Ochilmoqda..."
                      : !user
                      ? "🔑 Ochish"
                      : tooExpensive
                      ? "Balans yetarli"
                      : "🔑 Ochish"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="card plan-card">
        <h3>🪙 Qanday ishlaydi</h3>
        <p className="muted">
          1) Keyni ochasiz — narxi balansdan yechiladi. 2) Skin ehtimollik
          bo'yicha tushadi va inventarga yoziladi. 3) Inventarda sotib, narxning
          70% qaytarib olasiz. Har bir amal <b>Transaction</b> tarixida
          saqlanadi.
        </p>
        <div className="route-chips">
          {ROUTES.map((r) => (
            <code key={r} className="route-chip">
              {r}
            </code>
          ))}
        </div>
        <div className="plan-actions">
          {user ? (
            <button className="btn btn-ghost" onClick={() => setPage("inventory")}>
              🎒 Inventarni ko'rish
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => setPage("auth")}>
              Hisob ochish
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setPage("catalog")}>
            Katalogni ko'rish
          </button>
        </div>
      </section>

      {/* Tushgan skin natijasi - kazino uslubida kichik popup */}
      {drop && (
        <div className="drop-popup" onClick={() => setDrop(null)}>
          <div className="drop-popup-inner">
            <div className="drop-energy-bar">
              <div className="drop-spin-key">
                <span className="spin-icon">🔑</span>
                <span className="spin-label">Key aylanmoqda...</span>
              </div>
              <div className="drop-sparkle">✨</div>
            </div>
            <div className="drop-result-card">
              <div className="drop-key-header">
                <span className="drop-case-name">{drop.caseName}</span>
                <button className="drop-close-btn" onClick={(e) => { e.stopPropagation(); setDrop(null); }}>
                  ✕
                </button>
              </div>
              <div
                className="skin-thumb drop-thumb drop-pop"
                style={{ "--rarity": rarityColor(drop.dropped?.skin?.skinRarity) }}
              >
                <SkinThumb skin={drop.dropped?.skin} />
              </div>
              <h3 className="drop-name">{drop.dropped?.skin?.skinName}</h3>
              <RarityBadge rarity={drop.dropped?.skin?.skinRarity} />
              <p className="muted small">
                Narx: <b>{formatMoney(drop.dropped?.skin?.skinPrice)}</b> ·
                Inventarga tushdi
              </p>
              <p className="muted small">
                Qolgan balans: <b className="gold">{formatMoney(drop.wallet)}</b>
              </p>
              <div className="drop-actions">
                <button className="btn btn-primary btn-sm" onClick={() => setDrop(null)}>
                  Davom etish
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setDrop(null);
                    setPage("inventory");
                  }}
                >
                  Inventarni ko'rish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
