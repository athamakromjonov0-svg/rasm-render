import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useApp, formatMoney } from "../store.jsx";
import { Loader, Empty, RarityBadge, SkinThumb, RARITIES } from "../ui.jsx";

export default function Catalog() {
  const { user, setPage, toast, owned, setUser } = useApp();
  const [skins, setSkins] = useState(null);
  const [q, setQ] = useState("");
  const [rar, setRar] = useState("Hammasi");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api("/api/skins")
      .then(setSkins)
      .catch((e) => {
        setSkins([]);
        toast(e.message, "err");
      });
  }, [toast]);

  const buy = async (skin) => {
    if (!user) {
      setPage("auth");
      toast("Avval tizimga kiring", "err");
      return;
    }
    setBusyId(skin._id);
    try {
      const d = await api(`/api/users/${user._id}/buy-skin`, {
        method: "POST",
        body: { skinId: skin._id },
      });
      setUser(d.user);
      toast(`${skin.skinName} sotib olindi!`);
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setBusyId(null);
    }
  };

  if (skins === null) return <Loader text="Skinlar yuklanmoqda..." />;

  const ownedSet = new Set(owned);
  const filtered = skins.filter((s) => {
    const okR = rar === "Hammasi" || s.skinRarity === rar;
    const okQ = !q || (s.skinName || "").toLowerCase().includes(q.toLowerCase());
    return okR && okQ;
  });

  const prices = skins.map((s) => s.skinPrice);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;

  return (
    <div className="page">
      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-tag">🎮 CS2 Marketplace</span>
          <h1>
            Skinlar <em>bozori</em>
          </h1>
          <p className="muted">
            Eng zo'r skinlarni sotib oling, inventaringizda saqlang va
            kerak bo'lganda soting.
          </p>
          <div className="hero-stats">
            <div className="stat">
              <b>{skins.length}</b>
              <span>ta skin</span>
            </div>
            <div className="stat">
              <b>{formatMoney(minP)}</b>
              <span>arzon narx</span>
            </div>
            <div className="stat">
              <b>{formatMoney(maxP)}</b>
              <span>qimmat narx</span>
            </div>
            <div className="stat">
              <b>{user ? formatMoney(user.wallet) : "—"}</b>
              <span>sizning hamyon</span>
            </div>
          </div>
        </div>
      </section>

      {/* FILTR */}
      <div className="filters">
        <input
          className="input search"
          placeholder="🔍 Skin nomi bo'yicha qidirish..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="chips">
          {["Hammasi", ...Object.keys(RARITIES)].map((name) => (
            <button
              key={name}
              className={`chip ${rar === name ? "active" : ""}`}
              style={
                name === "Hammasi"
                  ? undefined
                  : { "--rarity": RARITIES[name].color }
              }
              onClick={() => setRar(name)}
            >
              {name === "Hammasi" ? name : RARITIES[name].label}
            </button>
          ))}
        </div>
      </div>

      {/* RO'YXAT */}
      {filtered.length === 0 ? (
        <Empty
          icon="🔍"
          title="Skin topilmadi"
          text="Qidiruv yoki filtrni o'zgartirib ko'ring"
          actionLabel="Filtrlarni tozalash"
          onAction={() => {
            setQ("");
            setRar("Hammasi");
          }}
        />
      ) : (
        <div className="grid grid-4">
          {filtered.map((s, i) => {
            const r = RARITIES[s.skinRarity] || { color: "#8a94ad" };
            const isOwned = ownedSet.has(s._id);
            const tooExpensive = user && user.wallet < s.skinPrice;
            return (
              <article
                key={s._id}
                className="card skin-card"
                style={{ "--rarity": r.color, animationDelay: `${i * 40}ms` }}
              >
                <div className="skin-thumb">
                  <SkinThumb skin={s} />
                </div>
                <div className="skin-body">
                  <div className="skin-head">
                    <h3 title={s.skinName}>{s.skinName}</h3>
                    <RarityBadge rarity={s.skinRarity} />
                  </div>
                  <div className="skin-foot">
                    <span className="price">{formatMoney(s.skinPrice)}</span>

                    {isOwned ? (
                      <span className="owned-pill">✓ Sizda bor</span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={busyId === s._id || tooExpensive}
                        onClick={() => buy(s)}
                        title={tooExpensive ? "Balans yetarli emas" : undefined}
                      >
                        {busyId === s._id
                          ? "..."
                          : !user
                          ? "Sotib olish"
                          : tooExpensive
                          ? "Balans yetarli"
                          : "Sotib olish"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
