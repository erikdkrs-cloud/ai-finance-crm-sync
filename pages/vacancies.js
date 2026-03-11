import React, { useState, useEffect, useCallback, useRef } from "react";
import DkrsAppShell from "../components/DkrsAppShell";

function formatMoney(n) {
  if (!n) return "";
  return Number(n).toLocaleString("ru-RU") + " ₽";
}

function formatDate(d) {
  if (!d) return "";
  var date = new Date(d);
  var now = new Date();
  var diff = now - date;
  var mins = Math.floor(diff / 60000);
  var hours = Math.floor(diff / 3600000);
  var days = Math.floor(diff / 86400000);
  if (mins < 60) return mins + " мин назад";
  if (hours < 24) return hours + " ч назад";
  if (days < 7) return days + " дн назад";
  return date.toLocaleDateString("ru-RU");
}

function formatDateShort(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatTime(ts) {
  if (!ts) return "";
  var d = new Date(ts * 1000);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(ts) {
  if (!ts) return "";
  var d = new Date(ts * 1000);
  var today = new Date();
  var isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Сегодня, " + formatTime(ts);
  var yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Вчера, " + formatTime(ts);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) + " " + formatTime(ts);
}

function statusLabel(s) {
  if (s === "active") return { text: "Активна", color: "#22c55e", bg: "#f0fdf4" };
  if (s === "blocked") return { text: "Заблокирована", color: "#ef4444", bg: "#fef2f2" };
  if (s === "removed") return { text: "Удалена", color: "#6b7280", bg: "#f3f4f6" };
  if (s === "old") return { text: "Завершена", color: "#f59e0b", bg: "#fffbeb" };
  return { text: s || "—", color: "#6b7280", bg: "#f3f4f6" };
}

function parseCandidateInfo(msg) {
  if (!msg) return null;
  var info = {};
  var fioMatch = msg.match(/ФИО\s*[\n\u2014:]+\s*(.+)/i);
  if (fioMatch) info.fio = fioMatch[1].trim();
  var ageMatch = msg.match(/Возраст\s*[\n\u2014:]+\s*(\d+)/i);
  if (ageMatch) info.age = ageMatch[1];
  var citizenMatch = msg.match(/Гражданство\s*[\n\u2014:]+\s*(.+)/i);
  if (citizenMatch) info.citizenship = citizenMatch[1].trim();
  if (Object.keys(info).length === 0) return null;
  return info;
}

export default function VacanciesPage() {
  var _vacancies = useState([]), vacancies = _vacancies[0], setVacancies = _vacancies[1];
  var _responses = useState([]), responses = _responses[0], setResponses = _responses[1];
  var _accounts = useState([]), accounts = _accounts[0], setAccounts = _accounts[1];
  var _tab = useState("vacancies"), tab = _tab[0], setTab = _tab[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _syncing = useState(false), syncing = _syncing[0], setSyncing = _syncing[1];
  var _msg = useState(null), msg = _msg[0], setMsg = _msg[1];
  var _search = useState(""), search = _search[0], setSearch = _search[1];
  var _statusFilter = useState("all"), statusFilter = _statusFilter[0], setStatusFilter = _statusFilter[1];
  var _cityFilter = useState("all"), cityFilter = _cityFilter[0], setCityFilter = _cityFilter[1];
  var _sortBy = useState("responses"), sortBy = _sortBy[0], setSortBy = _sortBy[1];
  var _selectedVacancy = useState(null), selectedVacancy = _selectedVacancy[0], setSelectedVacancy = _selectedVacancy[1];
  var _selectedChat = useState(null), selectedChat = _selectedChat[0], setSelectedChat = _selectedChat[1];
  var _chatMessages = useState([]), chatMessages = _chatMessages[0], setChatMessages = _chatMessages[1];
  var _chatLoading = useState(false), chatLoading = _chatLoading[0], setChatLoading = _chatLoading[1];
  var _chatText = useState(""), chatText = _chatText[0], setChatText = _chatText[1];
  var _sending = useState(false), sending = _sending[0], setSending = _sending[1];
  var _chatPhone = useState(null), chatPhone = _chatPhone[0], setChatPhone = _chatPhone[1];
  var _showAddAccount = useState(false), showAddAccount = _showAddAccount[0], setShowAddAccount = _showAddAccount[1];
  var _accForm = useState({ name: "", client_id: "", client_secret: "" }), accForm = _accForm[0], setAccForm = _accForm[1];
  var _responseFilter = useState("all"), responseFilter = _responseFilter[0], setResponseFilter = _responseFilter[1];
  var _page = useState(1), currentPage = _page[0], setCurrentPage = _page[1];
  var PER_PAGE = 20;
  var chatEndRef = useRef(null);

  var fetchData = useCallback(function () {
    setLoading(true);
    Promise.all([
      fetch("/api/avito/vacancies").then(function (r) { return r.json(); }),
      fetch("/api/avito/responses").then(function (r) { return r.json(); }),
      fetch("/api/avito/accounts").then(function (r) { return r.json(); }),
    ]).then(function (results) {
      setVacancies(results[0].data || []);
      setResponses(results[1].data || []);
      setAccounts(results[2].data || []);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, []);

  useEffect(function () { fetchData(); }, [fetchData]);
  useEffect(function () { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  function doSync() {
    setSyncing(true); setMsg(null);
    fetch("/api/avito/sync?mode=items").then(function (r) { return r.json(); }).then(function (d1) {
      var vc = d1.synced ? d1.synced.vacancies : 0;
      setMsg({ type: "success", text: "⏳ Вакансии: " + vc + ". Загружаю отклики..." });
      var totalResp = 0; var pageNum = 0;
      function loadChats() {
        fetch("/api/avito/sync?mode=chats&chat_page=" + pageNum).then(function (r) { return r.json(); }).then(function (d) {
          var batch = d.synced ? d.synced.responses : 0; totalResp += batch;
          setMsg({ type: "success", text: "⏳ Загружено " + totalResp + " откликов..." });
          if (batch > 0 && !d.errors) { pageNum++; loadChats(); }
          else { setSyncing(false); setMsg({ type: "success", text: "✅ " + vc + " вакансий, " + totalResp + " откликов" }); fetchData(); }
        }).catch(function () { setSyncing(false); setMsg({ type: "success", text: "✅ " + vc + " вакансий, " + totalResp + " откликов" }); fetchData(); });
      }
      loadChats();
    }).catch(function (e) { setSyncing(false); setMsg({ type: "error", text: "❌ " + e.message }); });
  }

  function openChat(response) {
    setSelectedChat(response);
    setChatMessages([]); setChatPhone(response.phone || null); setChatLoading(true); setChatText("");
    fetch("/api/avito/chat?chat_id=" + response.avito_chat_id + "&account_id=" + response.account_id)
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.ok) setChatMessages(d.messages || []); setChatLoading(false); })
      .catch(function () { setChatLoading(false); });
  }

  function sendMessage() {
    if (!chatText.trim() || !selectedChat || sending) return;
    setSending(true);
    fetch("/api/avito/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: selectedChat.avito_chat_id, account_id: selectedChat.account_id, text: chatText.trim() }),
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) {
        setChatMessages(function (prev) { return prev.concat([{ id: Date.now(), direction: "out", content: chatText.trim(), created: Math.floor(Date.now() / 1000) }]); });
        setChatText("");
      } else { alert("Ошибка: " + (d.error || "Не удалось отправить")); }
      setSending(false);
    }).catch(function () { setSending(false); alert("Ошибка сети"); });
  }

  function refreshChat() {
    if (!selectedChat) return; setChatLoading(true);
    fetch("/api/avito/chat?chat_id=" + selectedChat.avito_chat_id + "&account_id=" + selectedChat.account_id)
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.ok) setChatMessages(d.messages || []); setChatLoading(false); })
      .catch(function () { setChatLoading(false); });
  }

  function addAccount(e) {
    e.preventDefault();
    fetch("/api/avito/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(accForm) })
      .then(function (r) { return r.json(); }).then(function (data) {
        if (data.ok) { setShowAddAccount(false); setAccForm({ name: "", client_id: "", client_secret: "" }); fetchData(); setMsg({ type: "success", text: "✅ Аккаунт добавлен" }); }
        else { setMsg({ type: "error", text: "❌ " + (data.error || "Ошибка") }); }
      });
  }

  function deleteAccount(id) {
    if (!confirm("Удалить аккаунт?")) return;
    fetch("/api/avito/accounts?id=" + id, { method: "DELETE" }).then(function () { fetchData(); });
  }

  var cities = [];
  vacancies.forEach(function (v) { if (v.city && cities.indexOf(v.city) === -1) cities.push(v.city); });
  cities.sort();

  var filtered = vacancies.filter(function (v) {
    if (search && v.title.toLowerCase().indexOf(search.toLowerCase()) === -1 && (v.city || "").toLowerCase().indexOf(search.toLowerCase()) === -1) return false;
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (cityFilter !== "all" && v.city !== cityFilter) return false;
    return true;
  });
  filtered.sort(function (a, b) {
    if (sortBy === "responses") return (b.responses_count || 0) - (a.responses_count || 0);
    if (sortBy === "salary") return (b.salary_from || 0) - (a.salary_from || 0);
    if (sortBy === "date") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return 0;
  });

  var totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  var paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  var totalActive = vacancies.filter(function (v) { return v.status === "active"; }).length;
  var totalViews = vacancies.reduce(function (s, v) { return s + (v.views || 0); }, 0);
  var totalResp = responses.length;
  var vacResponses = selectedVacancy ? responses.filter(function (r) { return r.vacancy_id === selectedVacancy.id; }) : [];
  var filteredResponses = responses.filter(function (r) { if (responseFilter === "all") return true; return r.status === responseFilter; });
  if (search && tab === "responses") {
    filteredResponses = filteredResponses.filter(function (r) {
      return (r.author_name || "").toLowerCase().indexOf(search.toLowerCase()) !== -1 || (r.message || "").toLowerCase().indexOf(search.toLowerCase()) !== -1;
    });
  }
    return (
    <DkrsAppShell>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>💼 Вакансии Авито</h1>
            <p style={{ margin: "4px 0 0", color: "#888", fontSize: 14 }}>Управление вакансиями и откликами</p>
          </div>
          <button onClick={doSync} disabled={syncing} style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
            border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 600,
            fontSize: 15, cursor: syncing ? "wait" : "pointer", opacity: syncing ? 0.7 : 1
          }}>
            {syncing ? "⏳ Синхронизация..." : "🔄 Синхронизировать"}
          </button>
        </div>

        {msg && (
          <div style={{
            padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 14, fontWeight: 500,
            background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: msg.type === "success" ? "#16a34a" : "#dc2626",
            border: "1px solid " + (msg.type === "success" ? "#bbf7d0" : "#fecaca"),
          }}>{msg.text}</div>
        )}

        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
          {[
            { key: "vacancies", icon: "📋", label: "Вакансии", count: vacancies.length },
            { key: "responses", icon: "💬", label: "Отклики", count: responses.length },
            { key: "accounts", icon: "⚙️", label: "Аккаунты", count: accounts.length },
          ].map(function (t) {
            return (
              <button key={t.key} onClick={function () { setTab(t.key); setCurrentPage(1); setSelectedVacancy(null); setSelectedChat(null); }} style={{
                flex: 1, padding: "14px 0", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
                background: tab === t.key ? "#6366f1" : "#fff", color: tab === t.key ? "#fff" : "#374151",
              }}>
                {t.icon} {t.label} ({t.count})
              </button>
            );
          })}
        </div>

        {/* ===== CHAT VIEW ===== */}
        {selectedChat && (
          <div>
            <button onClick={function () { setSelectedChat(null); }}
              style={{ background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 15, cursor: "pointer", marginBottom: 12, padding: 0 }}>
              ← Назад
            </button>

            <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 22,
                  }}>{(selectedChat.author_name || "?")[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedChat.author_name || "Без имени"}</div>
                    {selectedChat.vacancy_title && <div style={{ fontSize: 13, color: "#888" }}>📋 {selectedChat.vacancy_title}</div>}
                    {(function () {
                      var info = parseCandidateInfo(selectedChat.message);
                      if (!info) return null;
                      return (
                        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          {info.fio && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#f5f3ff", color: "#7c3aed", fontSize: 12, fontWeight: 600 }}>👤 {info.fio}</span>}
                          {info.age && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#f0fdf4", color: "#16a34a", fontSize: 12 }}>🎂 {info.age} лет</span>}
                          {info.citizenship && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12 }}>🌍 {info.citizenship}</span>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {(selectedChat.phone || chatPhone) && (
                    <a href={"tel:" + (selectedChat.phone || chatPhone)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "10px 20px",
                        borderRadius: 12, background: "#22c55e", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 15,
                      }}>
                      📞 {selectedChat.phone || chatPhone}
                    </a>
                  )}
                  <button onClick={refreshChat} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 14 }}>🔄</button>
                </div>
              </div>
            </div>

            <div style={{
              background: "#f8fafc", borderRadius: 16, border: "1px solid #e5e7eb",
              height: 420, overflowY: "auto", padding: 20, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8,
            }}>
              {chatLoading ? (
                <div style={{ textAlign: "center", color: "#888", paddingTop: 60 }}>⏳ Загрузка сообщений...</div>
              ) : chatMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#888", paddingTop: 60 }}>Сообщений пока нет</div>
              ) : chatMessages.map(function (m) {
                var isOut = m.direction === "out";
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: isOut ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "70%", padding: "10px 16px", borderRadius: 16,
                      background: isOut ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#fff",
                      color: isOut ? "#fff" : "#111", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      borderBottomRightRadius: isOut ? 4 : 16, borderBottomLeftRadius: isOut ? 16 : 4,
                    }}>
                      <div style={{ fontSize: 14, whiteSpace: "pre-line", lineHeight: 1.5 }}>{m.content}</div>
                      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6, textAlign: "right" }}>{formatDateTime(m.created)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input value={chatText} onChange={function (e) { setChatText(e.target.value); }}
                onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Введите сообщение..."
                style={{ flex: 1, padding: "14px 18px", borderRadius: 14, border: "1px solid #e5e7eb", fontSize: 15, outline: "none" }} />
              <button onClick={sendMessage} disabled={sending || !chatText.trim()}
                style={{
                  padding: "14px 28px", borderRadius: 14, border: "none",
                  background: chatText.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#e5e7eb",
                  color: chatText.trim() ? "#fff" : "#999", fontWeight: 700, fontSize: 15, cursor: chatText.trim() ? "pointer" : "default",
                }}>
                {sending ? "⏳" : "➤ Отправить"}
              </button>
            </div>
          </div>
        )}

        {/* ===== VACANCIES LIST ===== */}
        {tab === "vacancies" && !selectedVacancy && !selectedChat && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
              {[
                { icon: "📋", value: vacancies.length, label: "Всего", color: "#3b82f6" },
                { icon: "🟢", value: totalActive, label: "Активных", color: "#22c55e" },
                { icon: "👁", value: totalViews.toLocaleString("ru"), label: "Просмотров", color: "#f59e0b" },
                { icon: "💬", value: totalResp, label: "Откликов", color: "#8b5cf6" },
              ].map(function (s, i) {
                return (
                  <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "20px 16px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{s.label}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, background: "#fff", padding: "14px 16px", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexWrap: "wrap" }}>
              <input placeholder="🔍 Поиск..." value={search} onChange={function (e) { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }} />
              <select value={statusFilter} onChange={function (e) { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }}>
                <option value="all">Все статусы</option><option value="active">Активные</option><option value="old">Завершённые</option>
              </select>
              <select value={cityFilter} onChange={function (e) { setCityFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }}>
                <option value="all">Все города</option>
                {cities.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
              </select>
              <select value={sortBy} onChange={function (e) { setSortBy(e.target.value); }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }}>
                <option value="responses">По откликам</option><option value="salary">По зарплате</option><option value="date">По дате</option>
              </select>
            </div>

            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "14px 16px", textAlign: "left" }}>Вакансия</th>
                    <th style={{ padding: "14px 12px", textAlign: "left", width: 140 }}>Город</th>
                    <th style={{ padding: "14px 12px", textAlign: "center", width: 100 }}>Зарплата</th>
                    <th style={{ padding: "14px 12px", textAlign: "center", width: 70 }}>💬</th>
                    <th style={{ padding: "14px 12px", textAlign: "center", width: 90 }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" style={{ padding: 40, textAlign: "center", color: "#888" }}>⏳ Загрузка...</td></tr>
                  ) : paged.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: 40, textAlign: "center", color: "#888" }}>Нет вакансий</td></tr>
                  ) : paged.map(function (v) {
                    var st = statusLabel(v.status);
                    return (
                      <tr key={v.id} onClick={function () { setSelectedVacancy(v); }}
                        style={{ borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                        onMouseEnter={function (e) { e.currentTarget.style.background = "#f8fafc"; }}
                        onMouseLeave={function (e) { e.currentTarget.style.background = ""; }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 600 }}>{v.title}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>ID: {v.avito_id}</div>
                        </td>
                        <td style={{ padding: "14px 12px", color: "#555" }}>📍 {v.city || "—"}</td>
                        <td style={{ padding: "14px 12px", textAlign: "center", fontWeight: 600, color: "#059669" }}>{v.salary_from ? formatMoney(v.salary_from) : "—"}</td>
                        <td style={{ padding: "14px 12px", textAlign: "center" }}>
                          <span style={{ padding: "4px 12px", borderRadius: 20, fontWeight: 700, fontSize: 13, background: (v.responses_count || 0) > 0 ? "#f5f3ff" : "#f3f4f6", color: (v.responses_count || 0) > 0 ? "#7c3aed" : "#9ca3af" }}>{v.responses_count || 0}</span>
                        </td>
                        <td style={{ padding: "14px 12px", textAlign: "center" }}>
                          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color }}>{st.text}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: 16, borderTop: "1px solid #f0f0f0" }}>
                  <button onClick={function () { setCurrentPage(Math.max(1, currentPage - 1)); }} disabled={currentPage === 1}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>←</button>
                  {Array.from({ length: Math.min(totalPages, 7) }, function (_, i) {
                    var p = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                    return (
                      <button key={p} onClick={function () { setCurrentPage(p); }}
                        style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid " + (currentPage === p ? "#6366f1" : "#e5e7eb"), background: currentPage === p ? "#6366f1" : "#fff", color: currentPage === p ? "#fff" : "#374151", cursor: "pointer", fontWeight: currentPage === p ? 700 : 400 }}>{p}</button>
                    );
                  })}
                  <button onClick={function () { setCurrentPage(Math.min(totalPages, currentPage + 1)); }} disabled={currentPage === totalPages}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>→</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== VACANCY DETAIL ===== */}
        {tab === "vacancies" && selectedVacancy && !selectedChat && (
          <div>
            <button onClick={function () { setSelectedVacancy(null); }}
              style={{ background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 15, cursor: "pointer", marginBottom: 12, padding: 0 }}>
              ← Назад к списку
            </button>
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{selectedVacancy.title}</h2>
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 14, color: "#666", flexWrap: "wrap" }}>
                <span>📍 {selectedVacancy.city || "—"}</span>
                <span>💰 {selectedVacancy.salary_from ? formatMoney(selectedVacancy.salary_from) : "—"}</span>
                <span>💬 {vacResponses.length} откликов</span>
                {selectedVacancy.url && <a href={selectedVacancy.url} target="_blank" rel="noreferrer" style={{ color: "#6366f1", fontWeight: 600 }}>↗ Авито</a>}
              </div>
            </div>

            <h3 style={{ fontSize: 18, marginBottom: 12 }}>💬 Отклики ({vacResponses.length})</h3>
            {vacResponses.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#888" }}>Откликов пока нет</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {vacResponses.map(function (r) {
                  var info = parseCandidateInfo(r.message);
                  var phone = r.phone || (info && info.phone) || null;
                  return (
                    <div key={r.id} onClick={function () { openChat(r); }}
                      style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", transition: "all 0.15s" }}
                      onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(99,102,241,0.15)"; }}
                      onMouseLeave={function (e) { e.currentTarget.style.borderColor = "#f0f0f0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 18 }}>{(r.author_name || "?")[0].toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{r.author_name || "Без имени"}</div>
                            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                              {info && info.fio && <span style={{ fontSize: 12, color: "#7c3aed" }}>👤 {info.fio}</span>}
                              {info && info.age && <span style={{ fontSize: 12, color: "#16a34a" }}>🎂 {info.age}</span>}
                              {info && info.citizenship && <span style={{ fontSize: 12, color: "#2563eb" }}>🌍 {info.citizenship}</span>}
                              {phone && <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>📞 {phone}</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {phone && (
                            <a href={"tel:" + phone} onClick={function (e) { e.stopPropagation(); }}
                              style={{ padding: "6px 14px", borderRadius: 10, background: "#22c55e", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 12 }}>
                              📞 Позвонить
                            </a>
                          )}
                          <div style={{ fontSize: 12, color: "#888" }}>{formatDate(r.created_at)}</div>
                          <div style={{ color: "#6366f1", fontWeight: 600, fontSize: 20 }}>→</div>
                        </div>
                      </div>
                      {r.message && (
                        <div style={{ fontSize: 13, color: "#666", marginTop: 8, whiteSpace: "pre-line", maxHeight: 60, overflow: "hidden" }}>
                          {r.message.slice(0, 200)}{r.message.length > 200 ? "..." : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== RESPONSES TAB ===== */}
        {tab === "responses" && !selectedChat && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, background: "#fff", padding: "14px 16px", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <input placeholder="🔍 Поиск..." value={search} onChange={function (e) { setSearch(e.target.value); }}
                style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }} />
              <div style={{ padding: "10px 14px", fontSize: 14, color: "#888" }}>Всего: {filteredResponses.length}</div>
            </div>
            {filteredResponses.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#888" }}>Откликов нет</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredResponses.slice(0, 50).map(function (r) {
                  var info = parseCandidateInfo(r.message);
                  var phone = r.phone || (info && info.phone) || null;
                  return (
                    <div key={r.id} onClick={function () { openChat(r); }}
                      style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}
                      onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#6366f1"; }}
                      onMouseLeave={function (e) { e.currentTarget.style.borderColor = "#f0f0f0"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 17 }}>{(r.author_name || "?")[0].toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{r.author_name || "Без имени"}</div>
                            {r.vacancy_title && <div style={{ fontSize: 12, color: "#888" }}>📋 {r.vacancy_title}</div>}
                            {phone && <div style={{ fontSize: 13, color: "#059669", fontWeight: 700 }}>📞 {phone}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {phone && (
                            <a href={"tel:" + phone} onClick={function (e) { e.stopPropagation(); }}
                              style={{ padding: "6px 14px", borderRadius: 10, background: "#22c55e", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 12 }}>
                              📞
                            </a>
                          )}
                          <div style={{ fontSize: 12, color: "#888" }}>{formatDate(r.created_at)}</div>
                          <div style={{ color: "#6366f1", fontSize: 18 }}>💬</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== ACCOUNTS TAB ===== */}
        {tab === "accounts" && !selectedChat && (
          <div>
            <button onClick={function () { setShowAddAccount(!showAddAccount); }}
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
              {showAddAccount ? "✕ Отмена" : "+ Добавить аккаунт"}
            </button>
            {showAddAccount && (
              <form onSubmit={addAccount} style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Название</label>
                    <input value={accForm.name} onChange={function (e) { setAccForm(Object.assign({}, accForm, { name: e.target.value })); }}
                      required style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Client ID</label>
                    <input value={accForm.client_id} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_id: e.target.value })); }}
                      required style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Client Secret</label>
                    <input value={accForm.client_secret} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_secret: e.target.value })); }}
                      type="password" required style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                </div>
                <button type="submit" style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 600, cursor: "pointer" }}>✅ Сохранить</button>
              </form>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {accounts.map(function (acc) {
                return (
                  <div key={acc.id} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>⚙️ {acc.name}</div>
                      <div style={{ fontSize: 13, color: "#888" }}>Client ID: {(acc.client_id || "").slice(0, 8)}... | User ID: {acc.user_id || "—"}</div>
                    </div>
                    <button onClick={function () { deleteAccount(acc.id); }}
                      style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                      🗑 Удалить
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DkrsAppShell>
  );
}
