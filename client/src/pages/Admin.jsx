import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { useApp, formatMoney } from "../store.jsx";
import {
  Loader,
  Modal,
  Field,
  RarityBadge,
  SkinThumb,
  RARITIES,
  Empty,
} from "../ui.jsx";

const SKIN_EMPTY = { skinName: "", skinRarity: "Common", skinPrice: "" };

export default function Admin() {
  const { toast } = useApp();
  const [tab, setTab] = useState("skins");
  const [skins, setSkins] = useState(null);
  const [users, setUsers] = useState(null);
  const [skinModal, setSkinModal] = useState(null);
  const [userModal, setUserModal] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSkins = useCallback(async () => {
    try {
      setSkins(await api("/api/skins"));
    } catch (e) {
      toast(e.message, "err");
    }
  }, [toast]);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await api("/api/users"));
    } catch (e) {
      toast(e.message, "err");
    }
  }, [toast]);

  useEffect(() => {
    loadSkins();
    loadUsers();
  }, [loadSkins, loadUsers]);

  // ============ SKINS ============
  const submitSkin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { id, form, file } = skinModal;
      const url = id ? `/api/skins/${id}` : "/api/skins";
      const method = id ? "PUT" : "POST";

      if (file) {
        const fd = new FormData();
        fd.append("skinName", form.skinName);
        fd.append("skinRarity", form.skinRarity);
        fd.append("skinPrice", String(form.skinPrice));
        fd.append("file", file);
        await api(url, { method, form: fd });
      } else {
        await api(url, {
          method,
          body: {
            skinName: form.skinName,
            skinRarity: form.skinRarity,
            skinPrice: Number(form.skinPrice),
          },
        });
      }

      toast(id ? "Skin yangilandi" : "Yangi skin qo'shildi");
      setSkinModal(null);
      await loadSkins();
    } catch (e2) {
      toast(e2.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const deleteSkin = async (s) => {
    if (!window.confirm(`"${s.skinName}" o'chirilsinmi?`)) return;
    try {
      await api(`/api/skins/${s._id}`, { method: "DELETE" });
      toast("Skin o'chirildi");
      await loadSkins();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  // ============ USERS ============
  const submitUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { id, form } = userModal;
      if (id) {
        await api(`/api/users/${id}`, {
          method: "PATCH",
          body: { username: form.username, email: form.email },
        });
        toast("Foydalanuvchi yangilandi");
      } else {
        await api("/api/users", {
          method: "POST",
          body: {
            username: form.username,
            email: form.email,
            password: form.password,
          },
        });
        toast("Foydalanuvchi yaratildi");
      }
      setUserModal(null);
      await loadUsers();
    } catch (e2) {
      toast(e2.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const toggleBan = async (u) => {
    try {
      const d = await api(`/api/users/${u._id}/ban`, { method: "PATCH" });
      toast(d.message);
      await loadUsers();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  const deleteUser = async (u) => {
    if (
      !window.confirm(
        `"${u.username}" o'chirilsinmi? Bu amalni qaytarib bo'lmaydi!`
      )
    )
      return;
    try {
      await api(`/api/users/${u._id}`, { method: "DELETE" });
      toast("Foydalanuvchi o'chirildi");
      await loadUsers();
    } catch (e) {
      toast(e.message, "err");
    }
  };

  if (skins === null || users === null) return <Loader text="Ma'lumotlar..." />;

  const ql = q.toLowerCase();
  const skinList = skins.filter((s) =>
    (s.skinName || "").toLowerCase().includes(ql)
  );
  const userList = users.filter(
    (u) =>
      (u.username || "").toLowerCase().includes(ql) ||
      (u.email || "").toLowerCase().includes(ql)
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">🛠 Boshqaruv paneli</h1>
          <p className="muted">
            Katalog (skinlar) va foydalanuvchilarni boshqarish — faqat admin
            uchun.
          </p>
        </div>
        <div className="head-stats">
          <span className="status-pill">🎮 {skins.length} skin</span>
          <span className="status-pill">👥 {users.length} user</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="tabs">
          <button
            className={`tab ${tab === "skins" ? "active" : ""}`}
            onClick={() => setTab("skins")}
          >
            🎮 Skinlar
          </button>
          <button
            className={`tab ${tab === "users" ? "active" : ""}`}
            onClick={() => setTab("users")}
          >
            👥 Foydalanuvchilar
          </button>
        </div>

        <input
          className="input search"
          placeholder="🔍 Qidirish..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {tab === "skins" ? (
          <button
            className="btn btn-primary"
            onClick={() =>
              setSkinModal({ id: null, form: { ...SKIN_EMPTY }, file: null })
            }
          >
            ➕ Yangi skin
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() =>
              setUserModal({
                id: null,
                form: { username: "", email: "", password: "" },
              })
            }
          >
            ➕ Yangi user
          </button>
        )}
      </div>

      {/* ============ SKINS TABLE ============ */}
      {tab === "skins" &&
        (skinList.length === 0 ? (
          <Empty
            icon="🎮"
            title="Skin yo'q"
            text="Qidiruvni tozalang yoki yangi skin qo'shing"
            actionLabel="Yangi skin"
            onAction={() =>
              setSkinModal({ id: null, form: { ...SKIN_EMPTY }, file: null })
            }
          />
        ) : (
          <div className="card table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Rasm</th>
                  <th>Nomi</th>
                  <th>Noyobligi</th>
                  <th>Narx</th>
                  <th className="right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {skinList.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div className="table-thumb">
                        <SkinThumb skin={s} />
                      </div>
                    </td>
                    <td>
                      <b>{s.skinName}</b>
                    </td>
                    <td>
                      <RarityBadge rarity={s.skinRarity} />
                    </td>
                    <td className="price">{formatMoney(s.skinPrice)}</td>
                    <td className="right actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          setSkinModal({
                            id: s._id,
                            form: {
                              skinName: s.skinName,
                              skinRarity: s.skinRarity,
                              skinPrice: String(s.skinPrice),
                            },
                            file: null,
                          })
                        }
                      >
                        ✏️ Tahrirlash
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteSkin(s)}
                      >
                        🗑 O'chirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {/* ============ USERS TABLE ============ */}
      {tab === "users" &&
        (userList.length === 0 ? (
          <Empty
            icon="👥"
            title="Foydalanuvchi topilmadi"
            text="Qidiruvni tozalang"
            actionLabel="Qidiruvni tozalash"
            onAction={() => setQ("")}
          />
        ) : (
          <div className="card table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>Foydalanuvchi</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Hamyon</th>
                  <th>Holat</th>
                  <th className="right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {userList.map((u) => (
                  <tr key={u._id} className={u.isBanned ? "row-banned" : ""}>
                    <td>
                      <div className="user-cell">
                        <span className="avatar sm">
                          {(u.username || "?")[0].toUpperCase()}
                        </span>
                        <b>{u.username}</b>
                      </div>
                    </td>
                    <td className="muted">{u.email}</td>
                    <td>
                      <span
                        className={`role-pill role-${u.role}`}
                      >
                        {u.role === "admin" ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="price">{formatMoney(u.wallet)}</td>
                    <td>
                      {u.isBanned ? (
                        <span className="status-pill status-ban">Ban</span>
                      ) : (
                        <span className="status-pill status-ok">Faol</span>
                      )}
                    </td>
                    <td className="right actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          setUserModal({
                            id: u._id,
                            form: {
                              username: u.username,
                              email: u.email,
                              password: "",
                            },
                          })
                        }
                      >
                        ✏️
                      </button>
                      <button
                        className={`btn btn-sm ${
                          u.isBanned ? "btn-ghost" : "btn-warn"
                        }`}
                        onClick={() => toggleBan(u)}
                      >
                        {u.isBanned ? "Bandan chiqarish" : "Ban"}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteUser(u)}
                        disabled={u._id === undefined}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {/* ============ SKIN MODAL ============ */}
      {skinModal && (
        <Modal
          title={skinModal.id ? "✏️ Skinni tahrirlash" : "➕ Yangi skin"}
          onClose={() => setSkinModal(null)}
        >
          <form onSubmit={submitSkin} className="form">
            <Field label="Skin nomi">
              <input
                className="input"
                value={skinModal.form.skinName}
                onChange={(e) =>
                  setSkinModal({
                    ...skinModal,
                    form: { ...skinModal.form, skinName: e.target.value },
                  })
                }
                placeholder="masalan: AK-47 | Redline"
                required
              />
            </Field>

            <div className="row">
              <Field label="Noyobligi">
                <select
                  className="input"
                  value={skinModal.form.skinRarity}
                  onChange={(e) =>
                    setSkinModal({
                      ...skinModal,
                      form: { ...skinModal.form, skinRarity: e.target.value },
                    })
                  }
                >
                  {Object.keys(RARITIES).map((k) => (
                    <option key={k} value={k}>
                      {RARITIES[k].label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Narx ($)">
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={skinModal.form.skinPrice}
                  onChange={(e) =>
                    setSkinModal({
                      ...skinModal,
                      form: { ...skinModal.form, skinPrice: e.target.value },
                    })
                  }
                  required
                />
              </Field>
            </div>

            <Field
              label={
                skinModal.id
                  ? "Yangi rasm (ixtiyoriy — eskisini almashtiradi)"
                  : "Rasm fayli (ixtiyoriy)"
              }
              hint="jpg, jpeg, png, gif, webp, avif, svg, bmp — 5 MB gacha"
            >
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setSkinModal({
                    ...skinModal,
                    file: e.target.files?.[0] || null,
                  })
                }
              />
            </Field>

            {skinModal.file && (
              <img
                className="preview-img"
                src={URL.createObjectURL(skinModal.file)}
                alt="preview"
              />
            )}

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Yuklanmoqda..." : skinModal.id ? "Saqlash" : "Qo'shish"}
            </button>
          </form>
        </Modal>
      )}

      {/* ============ USER MODAL ============ */}
      {userModal && (
        <Modal
          title={userModal.id ? "✏️ Foydalanuvchini tahrirlash" : "➕ Yangi user"}
          onClose={() => setUserModal(null)}
        >
          <form onSubmit={submitUser} className="form">
            <Field label="Foydalanuvchi nomi">
              <input
                className="input"
                value={userModal.form.username}
                onChange={(e) =>
                  setUserModal({
                    ...userModal,
                    form: { ...userModal.form, username: e.target.value },
                  })
                }
                required
                minLength={3}
              />
            </Field>

            <Field label="Email">
              <input
                className="input"
                type="email"
                value={userModal.form.email}
                onChange={(e) =>
                  setUserModal({
                    ...userModal,
                    form: { ...userModal.form, email: e.target.value },
                  })
                }
                required
              />
            </Field>

            {!userModal.id && (
              <Field label="Parol" hint="Kamida 6 ta belgi — bcrypt bilan hash qilinadi">
                <input
                  className="input"
                  type="password"
                  value={userModal.form.password}
                  onChange={(e) =>
                    setUserModal({
                      ...userModal,
                      form: { ...userModal.form, password: e.target.value },
                    })
                  }
                  required
                  minLength={6}
                />
              </Field>
            )}

            <p className="muted small">
              Rol va hamyon shu oynadan o'zgartirilmaydi — xavfsizlik uchun.
            </p>

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "..." : userModal.id ? "Saqlash" : "Yaratish"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
