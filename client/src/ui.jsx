import { useState } from "react";

// CS2 uslubidagi rarity ranglari (nomlar inglizcha — CS2 standarti)
export const RARITIES = {
  Common: { label: "Common", color: "#b0c3d9" },
  Rare: { label: "Rare", color: "#4b69ff" },
  Epic: { label: "Epic", color: "#8847ff" },
  Legendary: { label: "Legendary", color: "#d32ce6" },
  Mythic: { label: "Mythic", color: "#ffd700" },
};

export const rarityInfo = (name) =>
  RARITIES[name] || { label: name || "—", color: "#8a94ad" };

// ---------- Yuklanmoqda ----------
export function Loader({ text = "Yuklanmoqda..." }) {
  return (
    <div className="loader-wrap">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ title, onClose, children }) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Yopish">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------- Rarity yorlig'i ----------
export function RarityBadge({ rarity }) {
  const r = rarityInfo(rarity);
  return (
    <span className="rarity-badge" style={{ "--rarity": r.color }}>
      {r.label}
    </span>
  );
}

// ---------- Skin rasmi (rasm bo'lmasa — chiroyli zaxira) ----------
export function SkinThumb({ skin }) {
  const [broken, setBroken] = useState(false);
  const src = skin?.skinImage;
  const label = (skin?.skinName || "?")
    .split("|")
    .pop()
    .trim()
    .slice(0, 2)
    .toUpperCase();

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={skin.skinName}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className="thumb-fallback">
      <span>{label}</span>
    </div>
  );
}

// ---------- Bo'sh holat ----------
export function Empty({ icon = "🗂", title, text, actionLabel, onAction }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actionLabel && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ---------- Form maydoni ----------
export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}
