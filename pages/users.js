import React, { useState, useEffect } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import { useAuth } from "../components/AuthProvider";

var ROLES = [
  { value: "admin", label: "Администратор", icon: "👑", color: "#ef4444" },
  { value: "manager", label: "Менеджер", icon: "👔", color: "#f97316" },
  { value: "viewer", label: "Наблюдатель", icon: "👁️", color: "#6366f1" },
];

export default function UsersPage() {
  var auth = useAuth();
  var _mounted = useState(false), mounted = _mounted[0], setMounted = _mounted[1];
  var _users = useState([]), users = _users[0], setUsers = _users[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _showAdd = useState(false), showAdd = _showAdd[0], setShowAdd = _showAdd[1];
  var _editUser = useState(null), editUser = _editUser[0], setEditUser = _editUser[1];
  var _msg = useState(""), msg = _msg[0], setMsg = _msg[1];
  var _msgType = useState(""), msgType = _msgType[0], setMsgType = _msgType[1];

  // Add form
  var _addName = useState(""), addName = _addName[0], setAddName = _addName[1];
  var _addEmail = useState(""), addEmail = _addEmail[0], setAddEmail = _addEmail[1];
  var _addPassword = useState(""), addPassword = _addPassword[0], setAddPassword = _addPassword[1];
  var _addRole = useState("viewer"), addRole = _addRole[0], setAddRole = _addRole[1];
  var _saving = useState(false), saving = _saving[0], setSaving = _saving[1];

  // Edit form
  var _editName = useState(""), editName = _editName[0], setEditName = _editName[1];
  var _editRole = useState(""), editRole = _editRole[0], setEditRole = _editRole[1];
  var _editPassword = useState(""), editPassword = _editPassword[0], setEditPassword = _editPassword[1];
  var _editActive = useState(true), editActive = _editActive[0], setEditActive = _editActive[1];

  useEffect(function () { setMounted(true); loadUsers(); }, []);

  function showMessage(text, type) {
    setMsg(text); setMsgType(type || "success");
    setTimeout(function () { setMsg(""); }, 3000);
  }

  async function loadUsers() {
    setLoading(true);
    try {
      var res = await fetch("/api/users");
      var json = await res.json();
      if (json.ok) setUsers(json.users || []);
      else showMessage("Ошибка: " + json.error, "error");
    } catch (e) { showMessage("Ошибка загрузки", "error"); }
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      var res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, password: addPassword, name: addName, role: addRole }),
      });
      var json = await res.json();
      if (!json.ok) throw new Error(json.error);
      showMessage("✅ Пользователь создан!", "success");
      setShowAdd(false);
      setAddName(""); setAddEmail(""); setAddPassword(""); setAddRole("viewer");
      loadUsers();
    } catch (e) { showMessage("❌ " + e.message, "error"); }
    setSaving(false);
  }

  function startEdit(u) {
    setEditUser(u.id);
    setEditName(u.name);
    setEditRole(u.role);
    setEditActive(u.is_active);
    setEditPassword("");
  }

  function cancelEdit() { setEditUser(null); }

  async function handleSaveEdit(userId) {
    setSaving(true);
    try {
      var body = { id: userId, name: editName, role: editRole, is_active: editActive };
      if (editPassword.length > 0) body.password = editPassword;
      var res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      var json = await res.json();
      if (!json.ok) throw new Error(json.error);
      showMessage("✅ Сохранено!", "success");
      setEditUser(null);
      loadUsers();
    } catch (e) { showMessage("❌ " + e.message, "error"); }
    setSaving(false);
  }

  async function handleDelete(userId, userName) {
    if (!confirm("Удалить пользователя " + userName + "?")) return;
    try {
      var res = await fetch("/api/users?id=" + userId, { method: "DELETE" });
      var json = await res.json();
      if (!json.ok) throw new Error(json.error);
      showMessage("🗑️ Пользователь удалён", "success");
      loadUsers();
    } catch (e) { showMessage("❌ " + e.message, "error"); }
  }

  async function handleToggleActive(u) {
    try {
      var res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, is_active: !u.is_active }),
      });
      var json = await res.json();
      if (!json.ok) throw new Error(json.error);
      loadUsers();
    } catch (e) { showMessage("❌ " + e.message, "error"); }
  }

  function getRoleInfo(role) {
    return ROLES.find(function (r) { return r.value === role; }) || ROLES[2];
  }

  function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <DkrsAppShell>
      <div className={"users-page" + (mounted ? " mounted" : "")}>

        {/* Header */}
        <div className="users-header">
          <div>
            <h1 className="users-title">👥 Управление пользователями</h1>
            <p className="users-subtitle">Создание, редактирование и управление доступом</p>
          </div>
          <button className="users-add-btn" onClick={function () { setShowAdd(!showAdd); }}>
            {showAdd ? "✕ Отмена" : "➕ Добавить"}
          </button>
        </div>

        {/* Message */}
        {msg && (
          <div className={"users-msg glass-card " + msgType}>
            {msg}
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="users-form-card glass-card" style={{ animation: "fadeInUp 0.3s ease both" }}>
            <h3>➕ Новый пользователь</h3>
            <form onSubmit={handleAdd} className="users-form">
              <div className="users-form-grid">
                <div className="auth-field">
                  <label>👤 Имя</label>
                  <input type="text" placeholder="Имя пользователя" value={addName}
                    onChange={function (e) { setAddName(e.target.value); }} required />
                </div>
                <div className="auth-field">
                  <label>📧 Email</label>
                  <input type="email" placeholder="email@example.com" value={addEmail}
                    onChange={function (e) { setAddEmail(e.target.value); }} required />
                </div>
                <div className="auth-field">
                  <label>🔒 Пароль</label>
                  <input type="password" placeholder="Минимум 6 символов" value={addPassword}
                    onChange={function (e) { setAddPassword(e.target.value); }} required />
                </div>
                <div className="auth-field">
                  <label>🎭 Роль</label>
                  <select value={addRole} onChange={function (e) { setAddRole(e.target.value); }}
                    className="users-select">
                    {ROLES.map(function (r) {
                      return <option key={r.value} value={r.value}>{r.icon} {r.label}</option>;
                    })}
                  </select>
                </div>
              </div>
              <div className="users-form-actions">
                <button type="submit" className="auth-btn" disabled={saving}>
                  {saving ? "Создаём..." : "Создать пользователя"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Roles legend */}
        <div className="users-roles-legend glass-card">
          {ROLES.map(function (r) {
            return (
              <div key={r.value} className="users-role-item">
                <span className="users-role-dot" style={{ background: r.color }}></span>
                <span>{r.icon} {r.label}</span>
              </div>
            );
          })}
        </div>

        {/* Users list */}
        {loading ? (
          <div className="dm-loading glass-card"><span className="loader-spinner"></span> Загрузка пользователей...</div>
        ) : users.length === 0 ? (
          <div className="dm-empty glass-card"><div className="dm-empty-icon">👥</div><p>Пользователей пока нет</p></div>
        ) : (
          <div className="users-list">
            {users.map(function (u) {
              var roleInfo = getRoleInfo(u.role);
              var isEditing = editUser === u.id;
              var isCurrentUser = auth.user && auth.user.id === u.id;

              return (
                <div key={u.id} className={"users-card glass-card" + (!u.is_active ? " inactive" : "") + (isEditing ? " editing" : "")}>

                  {isEditing ? (
                    /* Edit mode */
                    <div className="users-edit-form">
                      <h4>✏️ Редактирование: {u.email}</h4>
                      <div className="users-form-grid">
                        <div className="auth-field">
                          <label>👤 Имя</label>
                          <input type="text" value={editName}
                            onChange={function (e) { setEditName(e.target.value); }} />
                        </div>
                        <div className="auth-field">
                          <label>🎭 Роль</label>
                          <select value={editRole} onChange={function (e) { setEditRole(e.target.value); }}
                            className="users-select">
                            {ROLES.map(function (r) {
                              return <option key={r.value} value={r.value}>{r.icon} {r.label}</option>;
                            })}
                          </select>
                        </div>
                        <div className="auth-field">
                          <label>🔒 Новый пароль (необязательно)</label>
                          <input type="password" placeholder="Оставьте пустым" value={editPassword}
                            onChange={function (e) { setEditPassword(e.target.value); }} />
                        </div>
                        <div className="auth-field">
                          <label>📊 Статус</label>
                          <select value={editActive ? "true" : "false"}
                            onChange={function (e) { setEditActive(e.target.value === "true"); }}
                            className="users-select">
                            <option value="true">✅ Активен</option>
                            <option value="false">❌ Деактивирован</option>
                          </select>
                        </div>
                      </div>
                      <div className="users-edit-actions">
                        <button className="auth-btn" onClick={function () { handleSaveEdit(u.id); }} disabled={saving}>
                          {saving ? "Сохраняем..." : "💾 Сохранить"}
                        </button>
                        <button className="users-cancel-btn" onClick={cancelEdit}>Отмена</button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <React.Fragment>
                      <div className="users-card-top">
                        <div className="users-card-avatar" style={{ borderColor: roleInfo.color }}>
                          {u.name.split(" ").map(function (w) { return w[0]; }).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div className="users-card-info">
                          <div className="users-card-name">
                            {u.name}
                            {isCurrentUser && <span className="users-you-badge">это вы</span>}
                          </div>
                          <div className="users-card-email">{u.email}</div>
                        </div>
                        <div className="users-card-meta">
                          <span className="users-card-role" style={{ background: roleInfo.color + "18", color: roleInfo.color }}>
                            {roleInfo.icon} {roleInfo.label}
                          </span>
                          <span className={"users-card-status" + (u.is_active ? " active" : " disabled")}>
                            {u.is_active ? "✅ Активен" : "❌ Деактивирован"}
                          </span>
                        </div>
                      </div>
                      <div className="users-card-bottom">
                        <span className="users-card-date">📅 {fmtDate(u.created_at)}</span>
                        <div className="users-card-actions">
                          <button className="users-action-btn edit" onClick={function () { startEdit(u); }} title="Редактировать">
                            ✏️
                          </button>
                          <button className="users-action-btn toggle" onClick={function () { handleToggleActive(u); }}
                            title={u.is_active ? "Деактивировать" : "Активировать"}>
                            {u.is_active ? "🔒" : "🔓"}
                          </button>
                          {!isCurrentUser && (
                            <button className="users-action-btn delete"
                              onClick={function () { handleDelete(u.id, u.name); }} title="Удалить">
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="users-stats glass-card">
          <div className="users-stat">
            <span className="users-stat-num">{users.length}</span>
            <span className="users-stat-label">Всего</span>
          </div>
          <div className="users-stat">
            <span className="users-stat-num">{users.filter(function (u) { return u.role === "admin"; }).length}</span>
            <span className="users-stat-label">👑 Админы</span>
          </div>
          <div className="users-stat">
            <span className="users-stat-num">{users.filter(function (u) { return u.role === "manager"; }).length}</span>
            <span className="users-stat-label">👔 Менеджеры</span>
          </div>
          <div className="users-stat">
            <span className="users-stat-num">{users.filter(function (u) { return u.is_active; }).length}</span>
            <span className="users-stat-label">✅ Активных</span>
          </div>
        </div>

      </div>
    </DkrsAppShell>
  );
}
