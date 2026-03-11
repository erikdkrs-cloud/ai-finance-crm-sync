import React, { useState, useEffect, useCallback } from "react";
import DkrsAppShell from "../components/DkrsAppShell";

var STATUS_LABELS = { active: "🟢 Активна", removed: "⚪ Снята", blocked: "🔴 Заблокирована", old: "📁 Архив" };
var RESPONSE_STATUSES = [
  { key: "new", label: "Новый", color: "#6366f1" },
  { key: "in_progress", label: "В работе", color: "#f59e0b" },
  { key: "interview", label: "Собеседование", color: "#0ea5e9" },
  { key: "hired", label: "Нанят", color: "#10b981" },
  { key: "rejected", label: "Отклонён", color: "#ef4444" },
];

function fmtDate(d) {
  if (!d) return "—";
  var dt = new Date(d);
  return dt.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSalary(from, to) {
  if (!from && !to) return "—";
  if (from && to) return Number(from).toLocaleString("ru-RU") + " – " + Number(to).toLocaleString("ru-RU") + " ₽";
  if (from) return "от " + Number(from).toLocaleString("ru-RU") + " ₽";
  return "до " + Number(to).toLocaleString("ru-RU") + " ₽";
}

export default function VacanciesPage() {
  var _mounted = useState(false), mounted = _mounted[0], setMounted = _mounted[1];
  var _tab = useState("vacancies"), tab = _tab[0], setTab = _tab[1];
  var _vacancies = useState([]), vacancies = _vacancies[0], setVacancies = _vacancies[1];
  var _responses = useState([]), responses = _responses[0], setResponses = _responses[1];
  var _accounts = useState([]), accounts = _accounts[0], setAccounts = _accounts[1];
  var _stats = useState({}), stats = _stats[0], setStats = _stats[1];
  var _loading = useState(false), loading = _loading[0], setLoading = _loading[1];
  var _syncing = useState(false), syncing = _syncing[0], setSyncing = _syncing[1];
  var _search = useState(""), search = _search[0], setSearch = _search[1];
  var _statusFilter = useState(""), statusFilter = _statusFilter[0], setStatusFilter = _statusFilter[1];
  var _selVacancy = useState(null), selVacancy = _selVacancy[0], setSelVacancy = _selVacancy[1];
  var _showAddAccount = useState(false), showAddAccount = _showAddAccount[0], setShowAddAccount = _showAddAccount[1];
  var _accForm = useState({ name: "", client_id: "", client_secret: "" }), accForm = _accForm[0], setAccForm = _accForm[1];
  var _msg = useState(""), msg = _msg[0], setMsg = _msg[1];

  useEffect(function () { setMounted(true); loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      var _a = fetch("/api/avito/accounts").then(function (r) { return r.json(); });
      var _v = fetch("/api/avito/vacancies").then(function (r) { return r.json(); });
      var _r = fetch("/api/avito/responses").then(function (r) { return r.json(); });
      var results = await Promise.all([_a, _v, _r]);
      if (results[0].ok) setAccounts(results[0].accounts || []);
      if (results[1].ok) { setVacancies(results[1].vacancies || []); setStats(results[1].stats || {}); }
      if (results[2].ok) setResponses(results[2].responses || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function doSync() {
    setSyncing(true);
    setMsg("");
    try {
      var res = await fetch("/api/avito/sync");
      var data = await res.json();
      if (data.ok) {
        setMsg("✅ Синхронизировано: " + data.synced.vacancies + " вакансий, " + data.synced.responses + " откликов");
        loadAll();
      } else {
        setMsg("❌ " + (data.error || "Ошибка"));
      }
    } catch (e) { setMsg("❌ " + e.message); }
    setSyncing(false);
  }

  async function addAccount() {
    if (!accForm.name || !accForm.client_id || !accForm.client_secret) {
      setMsg("❌ Заполните все поля"); return;
    }
    try {
      var res = await fetch("/api/avito/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accForm),
      });
      var data = await res.json();
      if (data.ok) {
        setMsg("✅ Аккаунт добавлен");
        setShowAddAccount(false);
        setAccForm({ name: "", client_id: "", client_secret: "" });
        loadAll();
      } else { setMsg("❌ " + data.error); }
    } catch (e) { setMsg("❌ " + e.message); }
  }

  async function deleteAccount(id) {
    if (!confirm("Удалить аккаунт и все его данные?")) return;
    await fetch("/api/avito/accounts?id=" + id, { method: "DELETE" });
    loadAll();
  }

  async function updateResponse(id, field, value) {
    try {
      var body = { id: id };
      body[field] = value;
      await fetch("/api/avito/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      loadAll();
    } catch (e) { console.error(e); }
  }

  var filteredVacancies = vacancies.filter(function (v) {
    if (statusFilter && v.status !== statusFilter) return false;
    if (search) {
      var q = search.toLowerCase();
      if ((v.title || "").toLowerCase().indexOf(q) === -1 && (v.city || "").toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  });

  var vacancyResponses = selVacancy ? responses.filter(function (r) { return r.vacancy_id === selVacancy.id; }) : [];

  var newCount = responses.filter(function (r) { return r.status === "new"; }).length;

  return (
    <DkrsAppShell>
      <div className={"an-page" + (mounted ? " mounted" : "")}>

        <div className="an-header">
          <div>
            <h1 className="an-title">💼 Вакансии Авито</h1>
            <p className="an-subtitle">Управление вакансиями и откликами</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={doSync} disabled={syncing}
              style={{ padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 14, opacity: syncing ? 0.6 : 1 }}>
              {syncing ? "⏳ Синхронизация..." : "🔄 Синхронизировать"}
            </button>
          </div>
        </div>

        {msg && <div style={{ padding: "12px 20px", margin: "0 0 16px", borderRadius: 10, background: msg.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: msg.startsWith("✅") ? "#10b981" : "#ef4444", fontWeight: 600, fontSize: 14 }}>{msg}</div>}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: 4 }}>
          {[
            { key: "vacancies", label: "📋 Вакансии", count: stats.total || 0 },
            { key: "responses", label: "💬 Отклики", count: responses.length, badge: newCount },
            { key: "accounts", label: "⚙️ Аккаунты", count: accounts.length },
          ].map(function (t) {
            return (
              <button key={t.key} onClick={function () { setTab(t.key); setSelVacancy(null); }}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.2s",
                  background: tab === t.key ? "#fff" : "transparent", color: tab === t.key ? "#1e293b" : "#64748b",
                  boxShadow: tab === t.key ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                }}>
                {t.label} <span style={{ opacity: 0.5 }}>({t.count})</span>
                {t.badge > 0 && <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 11 }}>{t.badge}</span>}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="dm-loading glass-card"><span className="loader-spinner" /> Загрузка...</div>
        ) : (
          <React.Fragment>

            {/* VACANCIES TAB */}
            {tab === "vacancies" && (
              <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: 10 }}>🔍</span>
                    <input placeholder="Поиск вакансий..." value={search} onChange={function (e) { setSearch(e.target.value); }}
                      style={{ width: "100%", padding: "10px 10px 10px 36px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.06)", fontSize: 14, outline: "none" }} />
                  </div>
                  <select value={statusFilter} onChange={function (e) { setStatusFilter(e.target.value); }}
                    style={{ padding: "10px 16px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.06)", fontSize: 14 }}>
                    <option value="">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="removed">Снятые</option>
                    <option value="blocked">Заблокированные</option>
                  </select>
                </div>

                {/* KPI */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Всего", value: stats.total || 0, icon: "📋", bg: "#6366f1" },
                    { label: "Активных", value: stats.active || 0, icon: "🟢", bg: "#10b981" },
                    { label: "Просмотров", value: vacancies.reduce(function (s, v) { return s + (v.views || 0); }, 0), icon: "👁️", bg: "#0ea5e9" },
                    { label: "Откликов", value: responses.length, icon: "💬", bg: "#f59e0b" },
                  ].map(function (kpi, i) {
                    return (
                      <div key={i} style={{ background: kpi.bg + "10", borderRadius: 12, padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: 24 }}>{kpi.icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: kpi.bg }}>{kpi.value.toLocaleString("ru-RU")}</div>
                        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{kpi.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Vacancies list */}
                {filteredVacancies.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                    <div style={{ fontSize: 48 }}>📋</div>
                    <p>Нет вакансий. Добавьте аккаунт и нажмите "Синхронизировать"</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filteredVacancies.map(function (v) {
                      var isSelected = selVacancy && selVacancy.id === v.id;
                      return (
                        <div key={v.id} onClick={function () { setSelVacancy(isSelected ? null : v); }}
                          style={{
                            padding: "16px 20px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
                            border: isSelected ? "2px solid #6366f1" : "2px solid rgba(0,0,0,0.04)",
                            background: isSelected ? "rgba(99,102,241,0.04)" : "#fff",
                          }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{v.title}</div>
                              <div style={{ fontSize: 13, color: "#64748b", display: "flex", gap: 16, flexWrap: "wrap" }}>
                                {v.account_name && <span>🏢 {v.account_name}</span>}
                                {v.city && <span>📍 {v.city}</span>}
                                <span>💰 {fmtSalary(v.salary_from, v.salary_to)}</span>
                                <span>👁️ {v.views || 0}</span>
                                <span>💬 {v.responses_count || 0}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{STATUS_LABELS[v.status] || v.status}</span>
                              <span style={{ fontSize: 12, color: "#94a3b8" }}>{fmtDate(v.created_at)}</span>
                            </div>
                          </div>

                          {isSelected && vacancyResponses.length > 0 && (
                            <div style={{ marginTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 16 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>💬 Отклики ({vacancyResponses.length})</div>
                              {vacancyResponses.map(function (r) {
                                return (
                                  <div key={r.id} style={{ padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.02)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.author_name || "Без имени"}</div>
                                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{r.message ? r.message.slice(0, 100) : "—"}</div>
                                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{fmtDate(r.created_at)}</div>
                                    </div>
                                    <select value={r.status || "new"}
                                      onClick={function (e) { e.stopPropagation(); }}
                                      onChange={function (e) { updateResponse(r.id, "status", e.target.value); }}
                                      style={{ padding: "6px 12px", borderRadius: 8, border: "2px solid rgba(0,0,0,0.06)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                      {RESPONSE_STATUSES.map(function (s) {
                                        return <option key={s.key} value={s.key}>{s.label}</option>;
                                      })}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {isSelected && vacancyResponses.length === 0 && (
                            <div style={{ marginTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 16, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                              Откликов пока нет
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* RESPONSES TAB */}
            {tab === "responses" && (
              <div className="glass-card" style={{ padding: 20 }}>
                <h3 style={{ marginBottom: 16 }}>💬 Все отклики</h3>
                {responses.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Откликов пока нет</div>
                ) : (
                  <div className="dm-table-wrapper" style={{ padding: 0 }}>
                    <table className="dm-table">
                      <thead>
                        <tr>
                          <th>Имя</th><th>Вакансия</th><th>Аккаунт</th><th>Сообщение</th><th>Дата</th><th>Статус</th><th>Заметки</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responses.map(function (r) {
                          return (
                            <tr key={r.id}>
                              <td style={{ fontWeight: 600 }}>{r.author_name || "—"}</td>
                              <td style={{ fontSize: 13 }}>{r.vacancy_title || "—"}</td>
                              <td style={{ fontSize: 13 }}>{r.account_name || "—"}</td>
                              <td style={{ fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.message || "—"}</td>
                              <td style={{ fontSize: 13 }}>{fmtDate(r.created_at)}</td>
                              <td>
                                <select value={r.status || "new"}
                                  onChange={function (e) { updateResponse(r.id, "status", e.target.value); }}
                                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", fontSize: 12, fontWeight: 600 }}>
                                  {RESPONSE_STATUSES.map(function (s) { return <option key={s.key} value={s.key}>{s.label}</option>; })}
                                </select>
                              </td>
                              <td>
                                <input
                                  defaultValue={r.manager_notes || ""}
                                  placeholder="Заметка..."
                                  onBlur={function (e) { if (e.target.value !== (r.manager_notes || "")) updateResponse(r.id, "manager_notes", e.target.value); }}
                                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", fontSize: 12, width: 120 }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ACCOUNTS TAB */}
            {tab === "accounts" && (
              <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3>⚙️ Аккаунты Авито</h3>
                  <button onClick={function () { setShowAddAccount(!showAddAccount); }}
                    style={{ padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #10b981, #34d399)", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                    + Добавить аккаунт
                  </button>
                </div>

                {showAddAccount && (
                  <div style={{ padding: 20, borderRadius: 12, background: "rgba(0,0,0,0.02)", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Название</label>
                      <input value={accForm.name} onChange={function (e) { setAccForm(Object.assign({}, accForm, { name: e.target.value })); }}
                        placeholder="Мой аккаунт" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.06)", fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Client ID</label>
                      <input value={accForm.client_id} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_id: e.target.value })); }}
                        placeholder="abc123..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.06)", fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Client Secret</label>
                      <input value={accForm.client_secret} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_secret: e.target.value })); }}
                        placeholder="xyz789..." type="password" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.06)", fontSize: 14 }} />
                    </div>
                    <div style={{ gridColumn: "1/-1", display: "flex", gap: 10 }}>
                      <button onClick={addAccount} style={{ padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                        💾 Сохранить
                      </button>
                      <button onClick={function () { setShowAddAccount(false); }} style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", background: "#f8fafc", fontWeight: 600, fontSize: 14 }}>
                        Отмена
                      </button>
                    </div>
                  </div>
                )}

                {accounts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                    <div style={{ fontSize: 48 }}>⚙️</div>
                    <p>Добавьте аккаунт Авито для начала работы</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {accounts.map(function (acc) {
                      var tokenOk = acc.token_expires_at && new Date(acc.token_expires_at) > new Date();
                      return (
                        <div key={acc.id} style={{ padding: "16px 20px", borderRadius: 12, border: "2px solid rgba(0,0,0,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{acc.name}</div>
                            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                              {tokenOk ? "🟢 Подключён" : "🔴 Требуется синхронизация"}
                              {acc.user_id && <span> • ID: {acc.user_id}</span>}
                            </div>
                          </div>
                          <button onClick={function () { deleteAccount(acc.id); }}
                            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", background: "rgba(239,68,68,0.05)", color: "#ef4444", fontWeight: 600, fontSize: 13 }}>
                            🗑️ Удалить
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </React.Fragment>
        )}
      </div>
    </DkrsAppShell>
  );
}
