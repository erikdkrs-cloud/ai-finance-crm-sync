import { useState, useEffect } from "react";
import DkrsAppShell from "../../components/DkrsAppShell";
import { useAuth } from "../../components/AuthProvider";

export default function ProfilePage() {
  var auth = useAuth();
  var user = auth ? auth.user : null;
  var [profile, setProfile] = useState(null);
  var [editing, setEditing] = useState(false);
  var [form, setForm] = useState({});
  var [saving, setSaving] = useState(false);
  var [msg, setMsg] = useState("");

  useEffect(function () {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    try {
      var res = await fetch("/api/portal/profile");
      var data = await res.json();
      setProfile(data);
      setForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        middle_name: data.middle_name || "",
        phone: data.phone || "",
        telegram: data.telegram || "",
        birth_date: data.birth_date ? data.birth_date.slice(0, 10) : "",
        about: data.about || "",
        hobbies: data.hobbies || ""
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setMsg("");
    try {
      var res = await fetch("/api/portal/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      var data = await res.json();
      if (data.ok) {
        setMsg("✅ Профиль сохранён!");
        setEditing(false);
        loadProfile();
      } else {
        setMsg("❌ " + (data.error || "Ошибка"));
      }
    } catch (e) {
      setMsg("❌ Ошибка сервера");
    }
    setSaving(false);
  }

  function handleChange(field, value) {
    var newForm = {};
    Object.keys(form).forEach(function (k) { newForm[k] = form[k]; });
    newForm[field] = value;
    setForm(newForm);
  }

  var months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  var inputStyle = {
    width: "100%",
    padding: "10px 14px",
    background: "var(--input-bg, rgba(255,255,255,0.08))",
    border: "1px solid var(--card-border, rgba(255,255,255,0.15))",
    borderRadius: 10,
    color: "inherit",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box"
  };

  var labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    opacity: 0.6,
    marginBottom: 6
  };

  var getInitials = function () {
    if (profile && profile.first_name && profile.last_name) return profile.last_name[0] + profile.first_name[0];
    if (user && user.name) return user.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2);
    return "?";
  };

  return (
    <DkrsAppShell>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 0 40px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>👤 Мой профиль</h1>

        {msg && (
          <div style={{
            padding: "12px 16px",
            background: msg.includes("✅") ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
            border: "1px solid " + (msg.includes("✅") ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"),
            borderRadius: 12, marginBottom: 20, fontSize: 14
          }}>{msg}</div>
        )}

        {/* Карточка профиля */}
        <div style={{
          background: "var(--card-bg, rgba(255,255,255,0.05))",
          border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
          borderRadius: 16, padding: "32px", marginBottom: 24
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20, flexShrink: 0,
              background: (profile && profile.photo_url) ? "url(" + profile.photo_url + ") center/cover" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 800, color: "white"
            }}>
              {(!profile || !profile.photo_url) && getInitials()}
            </div>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>
                {profile ? (profile.last_name + " " + profile.first_name + " " + (profile.middle_name || "")).trim() : (user ? user.name : "")}
              </h2>
              <div style={{ opacity: 0.5, fontSize: 14 }}>
                {profile && profile.position_title ? profile.position_title : ""}{profile && profile.department_name ? " • " + profile.department_name : ""}
              </div>
              <div style={{ opacity: 0.4, fontSize: 13, marginTop: 4 }}>{profile ? profile.email : ""}</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              {!editing ? (
                <button onClick={function () { setEditing(true); setMsg(""); }} style={{
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  border: "none", borderRadius: 10, color: "white",
                  fontSize: 14, fontWeight: 600, cursor: "pointer"
                }}>✏️ Редактировать</button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveProfile} disabled={saving} style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    border: "none", borderRadius: 10, color: "white",
                    fontSize: 14, fontWeight: 600, cursor: "pointer"
                  }}>{saving ? "💾 ..." : "💾 Сохранить"}</button>
                  <button onClick={function () { setEditing(false); loadProfile(); }} style={{
                    padding: "10px 20px",
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 10, color: "#fca5a5",
                    fontSize: 14, fontWeight: 600, cursor: "pointer"
                  }}>Отмена</button>
                </div>
              )}
            </div>
          </div>

          {/* Форма */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Фамилия</label>
              {editing ? (
                <input style={inputStyle} value={form.last_name} onChange={function (e) { handleChange("last_name", e.target.value); }} />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 500, padding: "10px 0" }}>{profile ? profile.last_name || "—" : "—"}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Имя</label>
              {editing ? (
                <input style={inputStyle} value={form.first_name} onChange={function (e) { handleChange("first_name", e.target.value); }} />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 500, padding: "10px 0" }}>{profile ? profile.first_name || "—" : "—"}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Отчество</label>
              {editing ? (
                <input style={inputStyle} value={form.middle_name} onChange={function (e) { handleChange("middle_name", e.target.value); }} />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 500, padding: "10px 0" }}>{profile ? profile.middle_name || "—" : "—"}</div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>📱 Телефон</label>
              {editing ? (
                <input style={inputStyle} value={form.phone} onChange={function (e) { handleChange("phone", e.target.value); }} placeholder="+7 999 123-45-67" />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 500, padding: "10px 0" }}>{profile ? profile.phone || "—" : "—"}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>✈️ Telegram</label>
              {editing ? (
                <input style={inputStyle} value={form.telegram} onChange={function (e) { handleChange("telegram", e.target.value); }} placeholder="@username" />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 500, padding: "10px 0" }}>{profile ? profile.telegram || "—" : "—"}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>🎂 Дата рождения</label>
              {editing ? (
                <input style={inputStyle} type="date" value={form.birth_date} onChange={function (e) { handleChange("birth_date", e.target.value); }} />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 500, padding: "10px 0" }}>
                  {profile && profile.birth_date ? (function () {
                    var d = new Date(profile.birth_date);
                    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
                  })() : "—"}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>📝 О себе</label>
            {editing ? (
              <textarea style={Object.assign({}, inputStyle, { minHeight: 80, resize: "vertical" })} value={form.about}
                onChange={function (e) { handleChange("about", e.target.value); }} placeholder="Расскажите о себе..." />
            ) : (
              <div style={{ fontSize: 14, padding: "10px 0", opacity: profile && profile.about ? 1 : 0.4 }}>
                {profile ? profile.about || "Не заполнено" : "—"}
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>🎯 Увлечения</label>
            {editing ? (
              <textarea style={Object.assign({}, inputStyle, { minHeight: 60, resize: "vertical" })} value={form.hobbies}
                onChange={function (e) { handleChange("hobbies", e.target.value); }} placeholder="Ваши хобби и увлечения..." />
            ) : (
              <div style={{ fontSize: 14, padding: "10px 0", opacity: profile && profile.hobbies ? 1 : 0.4 }}>
                {profile ? profile.hobbies || "Не заполнено" : "—"}
              </div>
            )}
          </div>
        </div>
      </div>
    </DkrsAppShell>
  );
}
