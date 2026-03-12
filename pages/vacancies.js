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
  if (mins < 1) return "только что";
  if (mins < 60) return mins + " мин назад";
  if (hours < 24) return hours + " ч назад";
  if (days < 7) return days + " дн назад";
  return date.toLocaleDateString("ru-RU");
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
  if (d.toDateString() === today.toDateString()) return "Сегодня, " + formatTime(ts);
  var y = new Date(today); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Вчера, " + formatTime(ts);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) + " " + formatTime(ts);
}

var STATUSES = {
  "new": { label: "Новый", icon: "🔵", color: "#3b82f6", bg: "#eff6ff" },
  processing: { label: "В работе", icon: "🟡", color: "#f59e0b", bg: "#fffbeb" },
  hired: { label: "Записан", icon: "✅", color: "#22c55e", bg: "#f0fdf4" },
  rejected: { label: "Отказ", icon: "❌", color: "#ef4444", bg: "#fef2f2" },
};

function statusLabel(s) {
  return STATUSES[s] || STATUSES["new"];
}

function vacancyStatusLabel(s) {
  if (s === "active") return { text: "Активна", color: "#22c55e", bg: "#f0fdf4" };
  if (s === "old") return { text: "Завершена", color: "#f59e0b", bg: "#fffbeb" };
  return { text: s || "—", color: "#6b7280", bg: "#f3f4f6" };
}

export default function VacanciesPage() {
  var _vacancies = useState([]), vacancies = _vacancies[0], setVacancies = _vacancies[1];
  var _responses = useState([]), responses = _responses[0], setResponses = _responses[1];
  var _accounts = useState([]), accounts = _accounts[0], setAccounts = _accounts[1];
  var _tab = useState("inbox"), tab = _tab[0], setTab = _tab[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _syncing = useState(false), syncing = _syncing[0], setSyncing = _syncing[1];
  var _msg = useState(null), msg = _msg[0], setMsg = _msg[1];
  var _search = useState(""), search = _search[0], setSearch = _search[1];
  var _statusFilter = useState("all"), statusFilter = _statusFilter[0], setStatusFilter = _statusFilter[1];
  var _selectedResponse = useState(null), selectedResponse = _selectedResponse[0], setSelectedResponse = _selectedResponse[1];
  var _chatMessages = useState([]), chatMessages = _chatMessages[0], setChatMessages = _chatMessages[1];
  var _chatLoading = useState(false), chatLoading = _chatLoading[0], setChatLoading = _chatLoading[1];
  var _chatText = useState(""), chatText = _chatText[0], setChatText = _chatText[1];
  var _sending = useState(false), sending = _sending[0], setSending = _sending[1];
  var _showAddAccount = useState(false), showAddAccount = _showAddAccount[0], setShowAddAccount = _showAddAccount[1];
  var _accForm = useState({ name: "", client_id: "", client_secret: "" }), accForm = _accForm[0], setAccForm = _accForm[1];
  var _selectedVacancy = useState(null), selectedVacancy = _selectedVacancy[0], setSelectedVacancy = _selectedVacancy[1];
  var _sortBy = useState("date"), sortBy = _sortBy[0], setSortBy = _sortBy[1];
  var _vacSearch = useState(""), vacSearch = _vacSearch[0], setVacSearch = _vacSearch[1];
  var chatEndRef = useRef(null);

  var fetchData = useCallback(function () {
    setLoading(true);
    Promise.all([
      fetch("/api/avito/vacancies").then(function (r) { return r.json(); }),
      fetch("/api/avito/responses").then(function (r) { return r.json(); }),
      fetch("/api/avito/accounts").then(function (r) { return r.json(); }),
    ]).then(function (res) {
      setVacancies(res[0].data || []);
      setResponses(res[1].data || []);
      setAccounts(res[2].data || []);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, []);

  useEffect(function () { fetchData(); }, [fetchData]);
  useEffect(function () { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  function doSync() {
    setSyncing(true); setMsg(null);
    fetch("/api/avito/sync?mode=items").then(function (r) { return r.json(); }).then(function (d1) {
      var vc = d1.synced ? d1.synced.vacancies : 0;
      setMsg({ type: "success", text: "Вакансии: " + vc + ". Загружаю отклики..." });
      var totalR = 0; var pn = 0;
      function go() {
        fetch("/api/avito/sync?mode=chats&chat_page=" + pn).then(function (r) { return r.json(); }).then(function (d) {
          var batch = d.synced ? d.synced.responses : 0; totalR += batch;
          setMsg({ type: "success", text: "Загружено " + totalR + " откликов..." });
          if (batch > 0 && !d.errors) { pn++; go(); }
          else { setSyncing(false); setMsg({ type: "success", text: vc + " вакансий, " + totalR + " откликов синхронизировано" }); fetchData(); }
        }).catch(function () { setSyncing(false); fetchData(); });
      }
      go();
    }).catch(function (e) { setSyncing(false); setMsg({ type: "error", text: "Ошибка: " + e.message }); });
  }

  function openResponse(r) {
    setSelectedResponse(r);
    setChatMessages([]); setChatLoading(true); setChatText("");
    if (!r.is_read) {
      fetch("/api/avito/response-update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, is_read: true, mark_read: true }),
      }).then(function () {
        setResponses(function (prev) { return prev.map(function (x) { return x.id === r.id ? Object.assign({}, x, { is_read: true }) : x; }); });
      });
    }
    fetch("/api/avito/chat?chat_id=" + r.avito_chat_id + "&account_id=" + r.account_id)
      .then(function (res) { return res.json(); })
      .then(function (d) { if (d.ok) setChatMessages(d.messages || []); setChatLoading(false); })
      .catch(function () { setChatLoading(false); });
  }

  function updateStatus(id, status) {
    fetch("/api/avito/response-update", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, status: status }),
    }).then(function () {
      setResponses(function (prev) { return prev.map(function (x) { return x.id === id ? Object.assign({}, x, { status: status }) : x; }); });
      if (selectedResponse && selectedResponse.id === id) {
        setSelectedResponse(Object.assign({}, selectedResponse, { status: status }));
      }
    });
  }

  function updateNotes(id, notes) {
    fetch("/api/avito/response-update", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, notes: notes }),
    });
  }

  function sendMessage() {
    if (!chatText.trim() || !selectedResponse || sending) return;
    setSending(true);
    fetch("/api/avito/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: selectedResponse.avito_chat_id, account_id: selectedResponse.account_id, text: chatText.trim() }),
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) {
        setChatMessages(function (prev) { return prev.concat([{ id: Date.now(), direction: "out", content: chatText.trim(), created: Math.floor(Date.now() / 1000) }]); });
        setChatText("");
      } else { alert("Ошибка: " + (d.error || "")); }
      setSending(false);
    }).catch(function () { setSending(false); });
  }

  function refreshChat() {
    if (!selectedResponse) return; setChatLoading(true);
    fetch("/api/avito/chat?chat_id=" + selectedResponse.avito_chat_id + "&account_id=" + selectedResponse.account_id)
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.ok) setChatMessages(d.messages || []); setChatLoading(false); })
      .catch(function () { setChatLoading(false); });
  }

  function addAccount(e) {
    e.preventDefault();
    fetch("/api/avito/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(accForm) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (d.ok) { setShowAddAccount(false); setAccForm({ name: "", client_id: "", client_secret: "" }); fetchData(); }
      });
  }

  function deleteAccount(id) {
    if (!confirm("Удалить аккаунт?")) return;
    fetch("/api/avito/accounts?id=" + id, { method: "DELETE" }).then(function () { fetchData(); });
  }

  var unreadCount = responses.filter(function (r) { return !r.is_read; }).length;
  var newCount = responses.filter(function (r) { return r.status === "new" || !r.status; }).length;
  var processingCount = responses.filter(function (r) { return r.status === "processing"; }).length;
  var hiredCount = responses.filter(function (r) { return r.status === "hired"; }).length;
  var rejectedCount = responses.filter(function (r) { return r.status === "rejected"; }).length;

  var filtered = responses.filter(function (r) {
    if (tab === "inbox") {
      if (statusFilter === "all") return r.status === "new" || !r.status || r.status === "processing";
      return r.status === statusFilter;
    }
    if (tab === "hired") return r.status === "hired";
    if (tab === "rejected") return r.status === "rejected";
    if (tab === "all") {
      if (statusFilter !== "all") return r.status === statusFilter;
      return true;
    }
    return true;
  });

  if (selectedVacancy) {
    filtered = filtered.filter(function (r) { return r.vacancy_id === selectedVacancy.id; });
  }

  if (search) {
    var s = search.toLowerCase();
    filtered = filtered.filter(function (r) {
      return (r.author_name || "").toLowerCase().indexOf(s) !== -1 ||
        (r.candidate_name || "").toLowerCase().indexOf(s) !== -1 ||
        (r.phone || "").indexOf(s) !== -1 ||
        (r.vacancy_title || "").toLowerCase().indexOf(s) !== -1 ||
        (r.message || "").toLowerCase().indexOf(s) !== -1;
    });
  }

  filtered.sort(function (a, b) {
    if (sortBy === "unread") {
      if (!a.is_read && b.is_read) return -1;
      if (a.is_read && !b.is_read) return 1;
    }
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
    return (
    <DkrsAppShell>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>{"💼"} CRM Отклики</h1>
            <p style={{ margin: "2px 0 0", color: "#888", fontSize: 13 }}>{"🔵"} {unreadCount} непрочитанных | {"📋"} {responses.length} всего</p>
          </div>
          <button onClick={doSync} disabled={syncing} style={{
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none",
            borderRadius: 12, padding: "10px 24px", fontWeight: 600, fontSize: 14,
            cursor: syncing ? "wait" : "pointer", opacity: syncing ? 0.7 : 1,
          }}>
            {syncing ? "⏳ Синхронизация..." : "🔄 Синхронизировать"}
          </button>
        </div>

        {msg && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 500,
            background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: msg.type === "success" ? "#16a34a" : "#dc2626",
            border: "1px solid " + (msg.type === "success" ? "#bbf7d0" : "#fecaca"),
          }}>{msg.text}</div>
        )}

        {/* TABS */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
          {[
            { key: "inbox", label: "📥 Входящие", count: newCount + processingCount },
            { key: "hired", label: "✅ Записаны", count: hiredCount },
            { key: "rejected", label: "❌ Отказ", count: rejectedCount },
            { key: "all", label: "📋 Все", count: responses.length },
            { key: "vacancies", label: "💼 Вакансии", count: vacancies.length },
            { key: "accounts", label: "⚙️", count: accounts.length },
          ].map(function (t) {
            return (
              <button key={t.key} onClick={function () { setTab(t.key); setSelectedResponse(null); setSelectedVacancy(null); setSearch(""); setVacSearch(""); setStatusFilter("all"); }} style={{
                flex: 1, padding: "12px 0", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
                background: tab === t.key ? "#6366f1" : "#fff", color: tab === t.key ? "#fff" : "#374151",
              }}>
                {t.label}
                {t.count > 0 && <span style={{ marginLeft: 4, padding: "1px 7px", borderRadius: 10, fontSize: 11, background: tab === t.key ? "rgba(255,255,255,0.25)" : "#f3f4f6", color: tab === t.key ? "#fff" : "#6b7280" }}>{t.count}</span>}
              </button>
            );
          })}
        </div>

        {/* ===== RESPONSE DETAIL / CHAT ===== */}
        {selectedResponse && tab !== "vacancies" && tab !== "accounts" && (
          <div>
            <button onClick={function () { setSelectedResponse(null); }}
              style={{ background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 10, padding: 0 }}>
              ← Назад к списку
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, minHeight: 500 }}>

              {/* LEFT: Candidate Card */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Profile */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 22, flexShrink: 0,
                    }}>{(selectedResponse.candidate_name || selectedResponse.author_name || "?")[0].toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedResponse.candidate_name || selectedResponse.author_name || "Без имени"}
                      </div>
                      {selectedResponse.author_name && selectedResponse.author_name !== selectedResponse.candidate_name && (
                        <div style={{ fontSize: 12, color: "#888" }}>Avito: {selectedResponse.author_name}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedResponse.phone && (
                      <a href={"tel:" + selectedResponse.phone} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10,
                        background: "#22c55e", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 15,
                      }}>
                        {"📞"} {selectedResponse.phone}
                      </a>
                    )}
                    {selectedResponse.candidate_age && (
                      <div style={{ padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", fontSize: 13 }}>{"🎂"} Возраст: {selectedResponse.candidate_age} лет</div>
                    )}
                    {selectedResponse.candidate_citizenship && (
                      <div style={{ padding: "6px 12px", borderRadius: 8, background: "#eff6ff", fontSize: 13 }}>{"🌍"} {selectedResponse.candidate_citizenship}</div>
                    )}
                  </div>
                </div>

                {/* Vacancy info */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{"📋"} Вакансия</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{selectedResponse.vacancy_title || "—"}</div>
                  {selectedResponse.vacancy_code && <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>{"🆔"} {selectedResponse.vacancy_code}</div>}
                  {selectedResponse.vacancy_address && <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{"📍"} {selectedResponse.vacancy_address}</div>}
                  {selectedResponse.vacancy_city && <div style={{ fontSize: 12, color: "#666" }}>{"🏙️"} {selectedResponse.vacancy_city}</div>}
                </div>

                {/* Status buttons */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{"🎯"} Статус</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {Object.keys(STATUSES).map(function (key) {
                      var st = STATUSES[key];
                      var isActive = (selectedResponse.status || "new") === key;
                      return (
                        <button key={key} onClick={function () { updateStatus(selectedResponse.id, key); }}
                          style={{
                            padding: "10px 8px", borderRadius: 10, border: isActive ? "2px solid " + st.color : "1px solid #e5e7eb",
                            background: isActive ? st.bg : "#fff", cursor: "pointer", fontWeight: isActive ? 700 : 500,
                            fontSize: 13, color: isActive ? st.color : "#374151",
                          }}>
                          {st.icon} {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{"📝"} Заметки</div>
                  <textarea
                    defaultValue={selectedResponse.notes || ""}
                    onBlur={function (e) { updateNotes(selectedResponse.id, e.target.value); }}
                    placeholder="Добавьте заметку..."
                    style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>
              </div>

              {/* RIGHT: Chat */}
              <div style={{ display: "flex", flexDirection: "column", background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{"💬"} Чат</div>
                  <button onClick={refreshChat} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>{"🔄"}</button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8, minHeight: 350, maxHeight: 450, background: "#f8fafc" }}>
                  {chatLoading ? (
                    <div style={{ textAlign: "center", color: "#888", paddingTop: 60 }}>Загрузка...</div>
                  ) : chatMessages.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#888", paddingTop: 60 }}>Сообщений нет</div>
                  ) : chatMessages.map(function (m) {
                    var isOut = m.direction === "out";
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: isOut ? "flex-end" : "flex-start" }}>
                        <div style={{
                          maxWidth: "75%", padding: "10px 14px", borderRadius: 14,
                          background: isOut ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#fff",
                          color: isOut ? "#fff" : "#111", boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                          borderBottomRightRadius: isOut ? 4 : 14, borderBottomLeftRadius: isOut ? 14 : 4,
                        }}>
                          <div style={{ fontSize: 13, whiteSpace: "pre-line", lineHeight: 1.5 }}>{m.content}</div>
                          <div style={{ fontSize: 10, marginTop: 3, opacity: 0.6, textAlign: "right" }}>{formatDateTime(m.created)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
                  <input value={chatText} onChange={function (e) { setChatText(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Сообщение..."
                    style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 14, outline: "none" }} />
                  <button onClick={sendMessage} disabled={sending || !chatText.trim()}
                    style={{
                      padding: "12px 20px", borderRadius: 12, border: "none",
                      background: chatText.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#e5e7eb",
                      color: chatText.trim() ? "#fff" : "#999", fontWeight: 700, fontSize: 14,
                      cursor: chatText.trim() ? "pointer" : "default",
                    }}>
                    {sending ? "⏳" : "➤"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ===== RESPONSES LIST ===== */}
        {!selectedResponse && tab !== "vacancies" && tab !== "accounts" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, background: "#fff", padding: "12px 14px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexWrap: "wrap", alignItems: "center" }}>
              <input placeholder="Поиск по имени, телефону, вакансии..." value={search} onChange={function (e) { setSearch(e.target.value); }}
                style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }} />
              {tab === "inbox" && (
                <select value={statusFilter} onChange={function (e) { setStatusFilter(e.target.value); }}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value="all">Все входящие</option>
                  <option value="new">🔵 Новые ({newCount})</option>
                  <option value="processing">🟡 В работе ({processingCount})</option>
                </select>
              )}
              {tab === "all" && (
                <select value={statusFilter} onChange={function (e) { setStatusFilter(e.target.value); }}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value="all">Все статусы</option>
                  <option value="new">🔵 Новые ({newCount})</option>
                  <option value="processing">🟡 В работе ({processingCount})</option>
                  <option value="hired">✅ Записаны ({hiredCount})</option>
                  <option value="rejected">❌ Отказ ({rejectedCount})</option>
                </select>
              )}
              <select value={sortBy} onChange={function (e) { setSortBy(e.target.value); }}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}>
                <option value="date">По дате</option>
                <option value="unread">Сначала непрочитанные</option>
              </select>
              {selectedVacancy && (
                <button onClick={function () { setSelectedVacancy(null); }}
                  style={{ padding: "10px 14px", borderRadius: 10, background: "#f5f3ff", color: "#6366f1", border: "1px solid #c7d2fe", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  ✕ {selectedVacancy.title.slice(0, 30)}
                </button>
              )}
              <div style={{ fontSize: 13, color: "#888", padding: "10px 0" }}>Найдено: {filtered.length}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { icon: "🔵", label: "Новые", count: newCount, color: "#3b82f6", bg: "#eff6ff" },
                { icon: "🟡", label: "В работе", count: processingCount, color: "#f59e0b", bg: "#fffbeb" },
                { icon: "✅", label: "Записаны", count: hiredCount, color: "#22c55e", bg: "#f0fdf4" },
                { icon: "❌", label: "Отказ", count: rejectedCount, color: "#ef4444", bg: "#fef2f2" },
              ].map(function (s, i) {
                return (
                  <div key={i} style={{ background: s.bg, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, border: "1px solid " + s.color + "22" }}>
                    <div style={{ fontSize: 24 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{s.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Загрузка...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#fff", borderRadius: 16 }}>Нет откликов</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.slice(0, 100).map(function (r) {
                  var st = statusLabel(r.status || "new");
                  var isUnread = !r.is_read;
                  return (
                    <div key={r.id} onClick={function () { openResponse(r); }}
                      style={{
                        background: isUnread ? "#fefce8" : "#fff",
                        borderRadius: 14, padding: "14px 18px", cursor: "pointer",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                        border: isUnread ? "2px solid #fbbf24" : "1px solid #f0f0f0",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={function (e) { e.currentTarget.style.borderColor = isUnread ? "#fbbf24" : "#f0f0f0"; e.currentTarget.style.transform = ""; }}>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <div style={{
                              width: 46, height: 46, borderRadius: "50%",
                              background: isUnread ? "linear-gradient(135deg,#f59e0b,#f97316)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: 700, color: "#fff", fontSize: 18,
                            }}>{(r.candidate_name || r.author_name || "?")[0].toUpperCase()}</div>
                            {isUnread && <div style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: "#ef4444", border: "2px solid #fff" }} />}
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 15 }}>{r.candidate_name || r.author_name || "Без имени"}</span>
                              {isUnread && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "#fbbf24", color: "#78350f", fontWeight: 700 }}>NEW</span>}
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                              {r.phone && <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>{"📞"} {r.phone}</span>}
                              {r.candidate_age && <span style={{ fontSize: 11, color: "#888" }}>{"🎂"} {r.candidate_age}</span>}
                              {r.candidate_citizenship && <span style={{ fontSize: 11, color: "#888" }}>{"🌍"} {r.candidate_citizenship}</span>}
                            </div>
                            <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, padding: "2px 8px", background: "#f5f3ff", borderRadius: 6 }}>
                                {"📋"} {r.vacancy_title || "—"}
                              </span>
                              {r.vacancy_code && <span style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>{"🆔"}{r.vacancy_code}</span>}
                              {(r.vacancy_address || r.vacancy_city) && <span style={{ fontSize: 10, color: "#888" }}>{"📍"}{r.vacancy_address || r.vacancy_city}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontSize: 11, color: "#888" }}>{formatDate(r.created_at)}</div>
                          <span style={{ padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                            {st.icon} {st.label}
                          </span>
                          <div style={{ display: "flex", gap: 4 }}>
                            {Object.keys(STATUSES).map(function (key) {
                              if ((r.status || "new") === key) return null;
                              var s2 = STATUSES[key];
                              return (
                                <button key={key} title={s2.label}
                                  onClick={function (e) { e.stopPropagation(); updateStatus(r.id, key); }}
                                  style={{
                                    width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb",
                                    background: "#fff", cursor: "pointer", fontSize: 12, display: "flex",
                                    alignItems: "center", justifyContent: "center", padding: 0,
                                  }}>{s2.icon}</button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {r.message && (
                        <div style={{ fontSize: 12, color: "#666", marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.message.slice(0, 150)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== VACANCIES TAB ===== */}
        {tab === "vacancies" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, background: "#fff", padding: "12px 14px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <input placeholder="🔍 Поиск вакансии по названию, городу, ID..." value={vacSearch} onChange={function (e) { setVacSearch(e.target.value); }}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }} />
              <div style={{ padding: "10px 0", fontSize: 13, color: "#888" }}>
                Всего: {vacancies.length} | Активных: {vacancies.filter(function (v) { return v.status === "active"; }).length}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vacancies.filter(function (v) {
                if (!vacSearch) return true;
                var q = vacSearch.toLowerCase();
                return (v.title || "").toLowerCase().indexOf(q) !== -1 ||
                  (v.city || "").toLowerCase().indexOf(q) !== -1 ||
                  String(v.avito_id).indexOf(q) !== -1;
              }).map(function (v) {
                var vs = vacancyStatusLabel(v.status);
                var rc = v.responses_count || 0;
                return (
                  <div key={v.id} onClick={function () { setSelectedVacancy(v); setTab("inbox"); setSearch(""); }}
                    style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", transition: "all 0.15s" }}
                    onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#6366f1"; }}
                    onMouseLeave={function (e) { e.currentTarget.style.borderColor = "#f0f0f0"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{v.title}</div>
                        <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "#888", flexWrap: "wrap" }}>
                          <span>{"📍"} {v.city || "—"}</span>
                          <span>{"💰"} {v.salary_from ? formatMoney(v.salary_from) : "—"}</span>
                          <span>{"🆔"} {v.avito_id}</span>
                          {v.url && <a href={v.url} target="_blank" rel="noreferrer" onClick={function (e) { e.stopPropagation(); }} style={{ color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>↗ Авито</a>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ padding: "6px 14px", borderRadius: 10, fontWeight: 700, fontSize: 14, background: rc > 0 ? "#f5f3ff" : "#f3f4f6", color: rc > 0 ? "#7c3aed" : "#9ca3af" }}>
                          {"💬"} {rc}
                        </span>
                        <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: vs.bg, color: vs.color }}>{vs.text}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {vacancies.length === 0 && !loading && (
                <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#fff", borderRadius: 16 }}>Нет вакансий. Нажмите Синхронизировать.</div>
              )}
            </div>
          </div>
        )}

        {/* ===== ACCOUNTS TAB ===== */}
        {tab === "accounts" && (
          <div>
            <button onClick={function () { setShowAddAccount(!showAddAccount); }}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 14 }}>
              {showAddAccount ? "✕ Отмена" : "+ Добавить"}
            </button>
            {showAddAccount && (
              <form onSubmit={addAccount} style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>Название</label>
                    <input value={accForm.name} onChange={function (e) { setAccForm(Object.assign({}, accForm, { name: e.target.value })); }}
                      required style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>Client ID</label>
                    <input value={accForm.client_id} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_id: e.target.value })); }}
                      required style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>Client Secret</label>
                    <input value={accForm.client_secret} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_secret: e.target.value })); }}
                      type="password" required style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>
                <button type="submit" style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Сохранить</button>
              </form>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {accounts.map(function (acc) {
                return (
                  <div key={acc.id} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{"⚙️"} {acc.name}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>ID: {(acc.client_id || "").slice(0, 8)}... | User: {acc.user_id || "—"}</div>
                    </div>
                    <button onClick={function () { deleteAccount(acc.id); }}
                      style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                      Удалить
                    </button>
                  </div>
                );
              })}
              {accounts.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#fff", borderRadius: 16 }}>Нет аккаунтов</div>
              )}
            </div>
          </div>
        )}

      </div>
    </DkrsAppShell>
  );
}
