import { useState } from "react";
import { api, setToken } from "../api.js";
import { useApp } from "../store.jsx";
import { Field } from "../ui.jsx";

export default function Auth() {
  const { setPage, toast, setUser, page } = useApp();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Muvaffaqiyatdan keyin: agar "auth" sahifasidan kelsak — katalogga,
  // aks holda (masalan Inventardan) — o'sha sahifada qolamiz.
  const afterAuth = () => setPage(page === "auth" ? "catalog" : page);

  const doLogin = async (email, password) => {
    const d = await api("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(d.token);
    setUser(d.user);
    toast(`Xush kelibsiz, ${d.user.username}!`);
    afterAuth();
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await doLogin(form.email, form.password);
      } else {
        await api("/api/auth/register", {
          method: "POST",
          body: {
            username: form.username,
            email: form.email,
            password: form.password,
          },
        });
        toast("Hisob yaratildi! Endi tizimga kirdingiz.");
        await doLogin(form.email, form.password);
      }
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-hero">
        <h1>
          CS2 skinlarini
          <br />
          <em>sotib ol, sot, yut!</em>
        </h1>
        <p className="muted">
          Katalogdan skin tanla, balansni to'ldir va savdoni boshla.
          Administratorlar kesh va katalogni boshqaradi.
        </p>
        <ul className="feature-list">
          <li>🔒 Parol bcrypt bilan himoyalangan</li>
          <li>🎫 JWT token bilan xavfsiz kirish</li>
          <li>🪙 Balans va savdo tarixi (Transaction)</li>
          <li>🎒 Har bir sotib olingan skin inventarda</li>
        </ul>
      </section>

      <section className="auth-card card">
        <div className="tabs">
          <button
            className={`tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >
            Kirish
          </button>
          <button
            className={`tab ${mode === "register" ? "active" : ""}`}
            onClick={() => setMode("register")}
          >
            Ro'yxatdan o'tish
          </button>
        </div>

        <form onSubmit={submit} className="form">
          {mode === "register" && (
            <Field label="Foydalanuvchi nomi" hint="Kamida 3 ta belgi">
              <input
                className="input"
                value={form.username}
                onChange={set("username")}
                placeholder="masalan: pro_gamer"
                autoComplete="username"
                required
                minLength={3}
              />
            </Field>
          )}

          <Field label="Email">
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="user@example.com"
              autoComplete="email"
              required
            />
          </Field>

          <Field
            label="Parol"
            hint={mode === "register" ? "Kamida 6 ta belgi" : undefined}
          >
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="••••••"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "register" ? 6 : 1}
            />
          </Field>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy
              ? "Yuklanmoqda..."
              : mode === "login"
              ? "Tizimga kirish"
              : "Hisob yaratish"}
          </button>
        </form>

        <p className="muted small center">
          {mode === "login" ? "Hisobingiz yo'qmi?" : "Allaqachon hisobingiz bormi?"}{" "}
          <button
            className="link"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Ro'yxatdan o'ting" : "Kirish"}
          </button>
        </p>
      </section>
    </div>
  );
}
