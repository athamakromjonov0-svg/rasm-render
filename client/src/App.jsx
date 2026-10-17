import { useEffect, useState, useCallback } from "react";
import { api, setToken, getToken } from "./api.js";
import { AppCtx, ownedIds, formatMoney, useApp } from "./store.jsx";
import { Loader, Modal } from "./ui.jsx";
import Auth from "./pages/Auth.jsx";
import Catalog from "./pages/Catalog.jsx";
import Inventory from "./pages/Inventory.jsx";
import Cases from "./pages/Cases.jsx";
import Admin from "./pages/Admin.jsx";

const NAV = [
  { key: "catalog", label: "Katalog", icon: "🏪" },
  { key: "inventory", label: "Inventar", icon: "🎒", need: "user" },
  { key: "cases", label: "Keyslar", icon: "🔑" },
  { key: "admin", label: "Boshqaruv", icon: "🛠", need: "admin" },
];

function Header({ page, setPage, user, onDeposit, onLogout }) {
  const items = NAV.filter(
    (i) =>
      !i.need ||
      (i.need === "user" && user) ||
      (i.need === "admin" && user?.role === "admin")
  );

  return (
    <header className="header">
      <div className="container header-inner">
        <button className="logo" onClick={() => setPage("catalog")}>
          <span className="logo-icon">🔥</span>
          <span className="logo-text">
            SKIN<em>MARKET</em>
          </span>
        </button>

        <nav className="nav">
          {items.map((i) => (
            <button
              key={i.key}
              className={`nav-btn ${page === i.key ? "active" : ""}`}
              onClick={() => setPage(i.key)}
            >
              <span className="nav-ico">{i.icon}</span>
              {i.label}
            </button>
          ))}
        </nav>

        <div className="header-right">
          {user ? (
            <>
              <button
                className="wallet-chip"
                onClick={onDeposit}
                title="Balansni to'ldirish (demo)"
              >
                <span className="wallet-ico">🪙</span>
                {formatMoney(user.wallet)}
                <span className="wallet-plus">+</span>
              </button>

              <div className="user-chip">
                <span className="avatar">{(user.username || "?")[0].toUpperCase()}</span>
                <span className="user-meta">
                  <b>{user.username}</b>
                  <small>{user.role === "admin" ? "Admin" : "Foydalanuvchi"}</small>
                </span>
              </div>

              <button className="btn btn-ghost btn-sm" onClick={onLogout}>
                Chiqish
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setPage("auth")}>
              Kirish
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function DepositModal({ user, onClose, onUpdated }) {
  const { toast } = useApp();
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);

  const submit = async (value) => {
    if (!value || value < 0.01) return toast("Minimal miqdor 0.01", "err");
    setBusy(true);
    try {
      const d = await api(`/api/users/${user._id}/deposit`, {
        method: "POST",
        body: { amount: value },
      });
      onUpdated({ ...user, wallet: d.wallet });
      toast(d.message || "Balans to'ldirildi");
      onClose();
    } catch (e) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="🪙 Balansni to'ldirish (demo)" onClose={onClose}>
      <p className="muted">
        Bu demo rejim — haqiqiy to'lov emas. Har bir oshirish{" "}
        <b>Transaction</b> yozuvi sifatida bazaga saqlanadi.
      </p>

      <div className="preset-row">
        {[100, 500, 1000, 5000].map((v) => (
          <button
            key={v}
            className="chip"
            disabled={busy}
            onClick={() => submit(v)}
          >
            +{v}
          </button>
        ))}
      </div>

      <div className="row">
        <input
          className="input"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => submit(Number(amount))}
        >
          {busy ? "..." : "To'ldirish"}
        </button>
      </div>

      <p className="muted small">
        Joriy balans: <b>{formatMoney(user.wallet)}</b>
      </p>
    </Modal>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState("catalog");
  const [toasts, setToasts] = useState([]);
  const [depositOpen, setDepositOpen] = useState(false);

  const toast = useCallback((text, type = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      3600
    );
  }, []);

  // Token bor bo'lsa — sessionni tiklash (GET /api/auth/me)
  const refreshMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }
    try {
      const d = await api("/api/auth/me");
      setUser(d.user);
      return d.user;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshMe().finally(() => setBooting(false));
  }, [refreshMe]);

  const logout = () => {
    setToken(null);
    setUser(null);
    setPage("catalog");
    toast("Hisobdan chiqildi");
  };

  const go = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ctx = {
    user,
    setUser,
    page,
    setPage: go,
    toast,
    refreshMe,
    logout,
    owned: ownedIds(user),
  };

  if (booting) return <Loader text="Ilova yuklanmoqda..." />;

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        <Header
          page={page}
          setPage={go}
          user={user}
          onDeposit={() => (user ? setDepositOpen(true) : go("auth"))}
          onLogout={logout}
        />

        <main className="main container">
          {page === "catalog" && <Catalog />}
          {page === "auth" && <Auth />}
          {page === "inventory" && (user ? <Inventory /> : <Auth />)}
          {page === "cases" && <Cases />}
          {page === "admin" &&
            (user?.role === "admin" ? <Admin /> : <Catalog />)}
        </main>

        <footer className="footer">
          <div className="container footer-inner">
            <span>🔥 CS2 Skin Market — frontend demo</span>
            <span className="muted">
              API: <code>/api</code> · <code>npm run dev</code> bilan ishga tushiring
            </span>
          </div>
        </footer>

        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.type === "err" ? "⚠️" : "✅"} {t.text}
            </div>
          ))}
        </div>

        {depositOpen && user && (
          <DepositModal
            user={user}
            onClose={() => setDepositOpen(false)}
            onUpdated={(u) => setUser(u)}
          />
        )}
      </div>
    </AppCtx.Provider>
  );
}
