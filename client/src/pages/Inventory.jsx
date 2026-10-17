import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { useApp, formatMoney } from "../store.jsx";
import { Loader, Empty, RarityBadge, SkinThumb, RARITIES } from "../ui.jsx";

export default function Inventory() {
  const { user, setPage, toast, setUser } = useApp();
  const [data, setData] = useState(null); // GET /api/inventory javobi
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/inventory?status=owned&limit=100");
      setData(d);
    } catch (e) {
      toast(e.message, "err");
      // Xatodan keyin sahifa bo'sh ko'rinishda qolmasin
      setData((prev) => prev || { items: [], count: 0 });
    }
  }, [toast]);

  useEffect(() => {
    if (!user) {
      setPage("auth");
      return;
    }
    load();
  }, [user, load, setPage]);

  // Sotish: backend 70% ni hisobga yozadi, wallet va katalog belgisi
  // (user.skins) bir vaqtda yangilanadi.
  const sell = async (item) => {
    setBusyId(item._id);
    try {
      const d = await api(`/api/inventory/${item._id}/sell`, { method: "POST" });
      setUser({ ...user, wallet: d.wallet, skins: d.skins ?? user.skins });
      toast(`${item.skin?.skinName || "Skin"} sotildi! +${formatMoney(d.earned)}`);
    } catch (e) {
      toast(e.message, "err");
      if (e.status === 409) load(); // allaqachon sotilgan bo'lsa — yangilaymiz
    } finally {
      setBusyId(null);
    }
  };

  if (!user || data === null)
    return <Loader text="Inventar yuklanmoqda..." />;

  const items = data.items || [];
  const total = items.reduce((sum, i) => sum + (i.skin?.skinPrice || 0), 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">🎒 Mening inventarim</h1>
          <p className="muted">
            Keshdan tushgan va sotib olingan skinlar. Har birini sotib, narxning
            70% qaytarib olishingiz mumkin.
          </p>
        </div>
        <span className="status-pill">👤 {user.username}</span>
      </div>

      <div className="inv-stats">
        <div className="card mini-stat">
          <span className="muted">Skinlar soni</span>
          <b>{data.count ?? items.length}</b>
        </div>
        <div className="card mini-stat">
          <span className="muted">Umumiy qiymat</span>
          <b>{formatMoney(total)}</b>
        </div>
        <div className="card mini-stat">
          <span className="muted">Hamyon</span>
          <b className="gold">{formatMoney(user.wallet)}</b>
        </div>
      </div>

      {items.length === 0 ? (
        <Empty
          icon="🛍"
          title="Inventar bo'sh"
          text="Hozircha bitta skin ham yo'q — kesh ochib ko'ring yoki katalogdan sotib oling"
          actionLabel="Kesh ochish"
          onAction={() => setPage("cases")}
        />
      ) : (
        <div className="grid grid-4">
          {items.map((item, idx) => {
            const s = item.skin;
            if (!s) return null;
            const r = RARITIES[s.skinRarity] || { color: "#8a94ad" };
            const sellPrice = Math.round((s.skinPrice || 0) * 0.7 * 100) / 100;
            const source = item.sourceCase
              ? `📦 ${item.sourceCase.caseName}`
              : "🏪 Katalogdan";
            const date = item.obtainedAt
              ? new Date(item.obtainedAt).toLocaleDateString("ru-RU")
              : "";
            const busy = busyId === item._id;

            return (
              <article
                key={item._id}
                className="card skin-card"
                style={{ "--rarity": r.color, animationDelay: `${idx * 40}ms` }}
              >
                <div className="skin-thumb">
                  <SkinThumb skin={s} />
                </div>
                <div className="skin-body">
                  <div className="skin-head">
                    <h3 title={s.skinName}>{s.skinName}</h3>
                    <RarityBadge rarity={s.skinRarity} />
                  </div>
                  <div className="muted small">
                    {source} {date && <>· {date}</>}
                  </div>
                  <div className="sell-line muted small">
                    Sotish narxi: <b>{formatMoney(sellPrice)}</b> (70%)
                  </div>
                  <div className="skin-foot">
                    <span className="price">{formatMoney(s.skinPrice)}</span>
                    <button
                      className="btn btn-sell btn-sm"
                      disabled={busy}
                      onClick={() => sell(item)}
                    >
                      {busy ? "..." : "Sotish"}
                    </button>
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
