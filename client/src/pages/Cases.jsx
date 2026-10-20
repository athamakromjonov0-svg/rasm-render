import { useCallback, useEffect, useRef, useState } from "react";
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

// ---------- Ruletka (case opening) sozlamalari ----------
// STRIP_LEN — lenta uzunligi (ta), SLOT — yutgan skin qaysi indeksda
// (lentaning boshidan). Nechta item bo'lsa, Spin shuncha uzoqqa
// suriladi va markazdagi darvozaga to'xtaydi.
const STRIP_LEN = 70;
const SLOT = 50;
const SPIN_MS = 4800; // aylanish davomiyligi
const MIN_UNLOCK_MS = 900; // "ochilmoqda..." minimally ko'rinadigan vaqt

// Keshdagi pool dan tasodifiy lenta yig'adi (g'olib keyin SLOT ga qo'yiladi)
const buildStrip = (pool) =>
  Array.from({ length: STRIP_LEN }, () =>
    pool.length ? pool[Math.floor(Math.random() * pool.length)] : null
  );

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
  const [rolling, setRolling] = useState(null); // ruletka: {phase: unlock|spin, ...}
  const stripRef = useRef(null); // lenta elementi (transform animatsiya)
  const spinDoneRef = useRef(false); // finish faqat bir marta chaqirilsin

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
    // 1-faza: "Quti ochilmoqda..." — lenta tasodifiy itemlar bilan ko'rinadi,
    // API javobi kelguncha kamida MIN_UNLOCK_MS ko'rinadi.
    const pool = (c.skins || []).map((i) => i.skin).filter(Boolean);
    spinDoneRef.current = false;
    setRolling({ caseId: c._id, caseName: c.caseName, phase: "unlock", strip: buildStrip(pool) });

    const t0 = Date.now();
    try {
      const d = await api(`/api/cases/${c._id}/open`, { method: "POST" });
      // Tanga yechildi + tushgan skin inventarga tushdi — holatni yangilaymiz
      setUser({ ...user, wallet: d.wallet, skins: d.skins ?? user.skins });
      toast(`Key ochildi!`, "ok");

      // 2-faza: g'olibni SLOT indeksiga qo'yib, lentani aylantiramiz.
      const wait = Math.max(0, MIN_UNLOCK_MS - (Date.now() - t0));
      window.setTimeout(() => {
        setRolling(
          (prev) =>
            prev && {
              ...prev,
              phase: "spin",
              winner: d.dropped?.skin || null,
              result: d,
            }
        );
      }, wait);
    } catch (e) {
      setRolling(null);
      if (e.status === 401) {
        setPage("auth");
        toast("Sessiya tugagan — qayta tizimga kiring", "err");
      } else {
        toast(e.message, "err");
      }
    } finally {
      setBusyId(null);
    }
  };

  // Aylanish tugadi → natija popupini ko'rsatamiz (faqat bir marta)
  const finishSpin = useCallback(() => {
    if (spinDoneRef.current || !rolling || rolling.phase !== "spin") return;
    spinDoneRef.current = true;
    setDrop({ caseName: rolling.caseName, ...rolling.result, caseId: rolling.caseId });
    setRolling(null);
  }, [rolling]);

  // 2-faza boshlanganda: transform ni 0 dan g'olib darvozagacha ease-out bilan
  // suramiz. transitionend + zaxira taymer (tab fonda bo'lsa ham yakunlanadi).
  useEffect(() => {
    if (rolling?.phase !== "spin") return;
    const el = stripRef.current;
    if (!el || el.children.length === 0) return;
    spinDoneRef.current = false;

    const n = el.children.length;
    const winIdx = Math.min(SLOT, n - 1);
    const stride =
      n > 1 ? el.children[1].offsetLeft - el.children[0].offsetLeft : 142;
    const win = el.children[winIdx];
    const boxW = el.parentElement.clientWidth;
    const target = boxW / 2 - (win.offsetLeft + win.offsetWidth / 2);

    el.style.transition = "none";
    el.style.transform = "translateX(0px)";
    void el.offsetWidth; // reflow — yangi boshlanish nuqtasini majburlaymiz
    el.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.1, 0.72, 0.1, 1)`;
    el.style.transform = `translateX(${target}px)`;

    const onEnd = (e) => {
      if (e.propertyName === "transform") finishSpin();
    };
    el.addEventListener("transitionend", onEnd);
    const guard = window.setTimeout(finishSpin, SPIN_MS + 800);
    return () => {
      el.removeEventListener("transitionend", onEnd);
      window.clearTimeout(guard);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling?.phase]);

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

      {/* ---------- CS2 uslubidagi quti ochish ruletkasi ---------- */}
      {rolling && (
        <div className="case-open-overlay">
          <div className="case-open-box">
            <h2 className="case-open-title">Omadingni sinang!</h2>
            <div className="case-open-window">
              <div
                className="case-open-strip"
                ref={stripRef}
                data-phase={rolling.phase}
              >
                {rolling.strip.map((s, i) => {
                  const skin =
                    rolling.phase === "spin" && i === SLOT
                      ? rolling.winner
                      : s;
                  const isWin =
                    rolling.phase === "spin" && i === SLOT && !!rolling.winner;
                  const r = rarityColor(skin?.skinRarity);
                  return (
                    <div
                      key={i}
                      className={`case-open-item${isWin ? " is-win" : ""}`}
                      style={{ "--rarity": r }}
                    >
                      <div className="co-thumb">
                        <SkinThumb skin={skin} />
                      </div>
                      <span className="co-name">
                        {skin?.skinName?.split("|").pop()?.trim() || "?"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Markazdagi qizil darvoza — g'olib shu yerga to'xtaydi */}
              <div className="case-open-gate" aria-hidden="true">
                <span className="gate-arrow gate-arrow-top">▼</span>
                <span className="gate-arrow gate-arrow-bottom">▲</span>
              </div>
            </div>
            <p className="case-open-status">
              {rolling.phase === "unlock"
                ? "Quti ochilmoqda..."
                : "Omadingni tekshirish..."}
            </p>
          </div>
        </div>
      )}

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
