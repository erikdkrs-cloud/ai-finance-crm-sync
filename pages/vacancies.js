import React, { useState, useEffect, useCallback } from "react";
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
  var fioMatch = msg.match(/ФИО\s*[\n—:]+\s*(.+)/i);
  if (fioMatch) info.fio = fioMatch[1].trim();
  var ageMatch = msg.match(/Возраст\s*[\n—:]+\s*(\d+)/i);
  if (ageMatch) info.age = ageMatch[1];
  var citizenMatch = msg.match(/Гражданство\s*[\n—:]+\s*(.+)/i);
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
  var _showAddAccount = useState(false), showAddAccount = _showAddAccount[0], setShowAddAccount = _showAddAccount[1];
  var _accForm = useState({ name: "", client_id: "", client_secret: "" }), accForm = _accForm[0], setAccForm = _accForm[1];
  var _responseFilter = useState("all"), responseFilter = _responseFilter[0], setResponseFilter = _responseFilter[1];
  var _page = useState(1), currentPage = _page[0], setCurrentPage = _page[1];
  var PER_PAGE = 20;

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

        function doSync() {
    setSyncing(true); setMsg(null);

    fetch("/api/avito/sync?mode=items").then(function(r) { return r.json(); }).then(function(d1) {
      var vc = d1.synced ? d1.synced.vacancies : 0;
      setMsg({ type: "success", text: "⏳ Вакансии: " + vc + ". Загружаю отклики..." });

      var totalResp = 0;
      var pageNum = 0;

      function loadChats() {
        fetch("/api/avito/sync?mode=chats&chat_page=" + pageNum).then(function(r) { return r.json(); }).then(function(d) {
          var batch = d.synced ? d.synced.responses : 0;
          totalResp += batch;
          setMsg({ type: "success", text: "⏳ Загружено " + totalResp + " откликов..." });

          if (batch > 0 && !d.errors) {
            pageNum++;
            loadChats();
          } else {
            setSyncing(false);
            setMsg({ type: "success", text: "✅ " + vc + " вакансий, " + totalResp + " откликов" });
            fetchData();
          }
        }).catch(function() {
          setSyncing(false);
          setMsg({ type: "success", text: "✅ " + vc + " вакансий, " + totalResp + " откликов" });
          fetchData();
        });
      }

      loadChats();
    }).catch(function(e) {
      setSyncing(false);
      setMsg({ type: "error", text: "❌ " + e.message });
    });
  }
    
    fetch("/api/avito/sync?mode=items").then(function(r) { return r.json(); }).then(function(d1) {
      var vc = d1.synced ? d1.synced.vacancies : 0;
      setMsg({ type: "success", text: "⏳ Вакансии: " + vc + ". Загружаю отклики..." });
      
      // Reset chat offset
      fetch("/api/avito/sync?mode=chats&chat_page=0").then(function(r) { return r.json(); }).then(function(d2) {
        var rc = d2.synced ? d2.synced.responses : 0;
        
        function loadMore(page, total) {
          if (!d2.hasMoreChats && page > 0) {
            setSyncing(false);
            setMsg({ type: "success", text: "✅ " + vc + " вакансий, " + total + " откликов" });
            fetchData();
            return;
          }
          if (page > 0) {
            setMsg({ type: "success", text: "⏳ Загружено " + total + " откликов, продолжаю..." });
          }
          fetch("/api/avito/sync?mode=chats&chat_page=" + page).then(function(r) { return r.json(); }).then(function(d) {
            var newTotal = total + (d.synced ? d.synced.responses : 0);
            if (d.hasMoreChats) {
              loadMore(page + 1, newTotal);
            } else {
              setSyncing(false);
              setMsg({ type: "success", text: "✅ " + vc + " вакансий, " + newTotal + " откликов" });
              fetchData();
            }
          }).catch(function() {
            setSyncing(false);
            setMsg({ type: "success", text: "✅ " + vc + " вакансий, " + total + " откликов (частично)" });
            fetchData();
          });
        }
        
        loadMore(1, rc);
      });
    }).catch(function(e) {
      setSyncing(false);
      setMsg({ type: "error", text: "❌ " + e.message });
    });
  }

  function addAccount(e) {
    e.preventDefault();
    fetch("/api/avito/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(accForm),
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.ok) {
        setShowAddAccount(false);
        setAccForm({ name: "", client_id: "", client_secret: "" });
        fetchData();
        setMsg({ type: "success", text: "✅ Аккаунт добавлен" });
      } else {
        setMsg({ type: "error", text: "❌ " + (data.error || "Ошибка") });
      }
    });
  }

  function deleteAccount(id) {
    if (!confirm("Удалить аккаунт и все его данные?")) return;
    fetch("/api/avito/accounts?id=" + id, { method: "DELETE" }).then(function (r) { return r.json(); }).then(function () { fetchData(); });
  }

  // Filters
  var cities = [];
  vacancies.forEach(function (v) {
    if (v.city && cities.indexOf(v.city) === -1) cities.push(v.city);
  });
  cities.sort();

  var filtered = vacancies.filter(function (v) {
    if (search && v.title.toLowerCase().indexOf(search.toLowerCase()) === -1 &&
      (v.city || "").toLowerCase().indexOf(search.toLowerCase()) === -1) return false;
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (cityFilter !== "all" && v.city !== cityFilter) return false;
    return true;
  });

  // Sort
  filtered.sort(function (a, b) {
    if (sortBy === "responses") return (b.responses_count || 0) - (a.responses_count || 0);
    if (sortBy === "salary") return (b.salary_from || 0) - (a.salary_from || 0);
    if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
    if (sortBy === "date") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (sortBy === "views") return (b.views || 0) - (a.views || 0);
    return 0;
  });

  var totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  var paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Stats
  var totalActive = vacancies.filter(function (v) { return v.status === "active"; }).length;
  var totalViews = vacancies.reduce(function (s, v) { return s + (v.views || 0); }, 0);
  var totalResp = responses.length;

  // Responses for selected vacancy
  var vacResponses = selectedVacancy
    ? responses.filter(function (r) { return r.vacancy_id === selectedVacancy.id; })
    : [];

  // Filtered responses for tab
  var filteredResponses = responses.filter(function (r) {
    if (responseFilter === "all") return true;
    return r.status === responseFilter;
  });
  if (search && tab === "responses") {
    filteredResponses = filteredResponses.filter(function (r) {
      return (r.author_name || "").toLowerCase().indexOf(search.toLowerCase()) !== -1 ||
        (r.message || "").toLowerCase().indexOf(search.toLowerCase()) !== -1;
    });
  }

  return (
    <DkrsAppShell>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, display: "flex", alignItems: "center", gap: 10 }}>💼 Вакансии Авито</h1>
            <p style={{ margin: "4px 0 0", color: "#888", fontSize: 14 }}>Управление вакансиями и откликами</p>
          </div>
          <button onClick={doSync} disabled={syncing} style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
            border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 600,
            fontSize: 15, cursor: syncing ? "wait" : "pointer", opacity: syncing ? 0.7 : 1,
            display: "flex", alignItems: "center", gap: 8
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

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
          {[
            { key: "vacancies", icon: "📋", label: "Вакансии", count: vacancies.length },
            { key: "responses", icon: "💬", label: "Отклики", count: responses.length },
            { key: "accounts", icon: "⚙️", label: "Аккаунты", count: accounts.length },
          ].map(function (t) {
            var active = tab === t.key;
            return (
              <button key={t.key} onClick={function () { setTab(t.key); setCurrentPage(1); setSelectedVacancy(null); }} style={{
                flex: 1, padding: "14px 0", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
                background: active ? "#6366f1" : "#fff", color: active ? "#fff" : "#374151",
                transition: "all 0.2s",
              }}>
                {t.icon} {t.label} ({t.count})
              </button>
            );
          })}
        </div>

        {/* ===== VACANCIES TAB ===== */}
        {tab === "vacancies" && !selectedVacancy && (
          <div>
            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
              {[
                { icon: "📋", value: vacancies.length, label: "Всего", color: "#3b82f6", bg: "#eff6ff" },
                { icon: "🟢", value: totalActive, label: "Активных", color: "#22c55e", bg: "#f0fdf4" },
                { icon: "👁", value: totalViews.toLocaleString("ru"), label: "Просмотров", color: "#f59e0b", bg: "#fffbeb" },
                { icon: "💬", value: totalResp, label: "Откликов", color: "#8b5cf6", bg: "#f5f3ff" },
              ].map(function (s, i) {
                return (
                  <div key={i} style={{
                    background: "#fff", borderRadius: 16, padding: "20px 16px", textAlign: "center",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{s.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Filters Bar */}
            <div style={{
              display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center",
              background: "#fff", padding: "14px 16px", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <input placeholder="🔍 Поиск по названию или городу..." value={search}
                onChange={function (e) { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }} />

              <select value={statusFilter} onChange={function (e) { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }}>
                <option value="all">Все статусы</option>
                <option value="active">🟢 Активные</option>
                <option value="old">🟡 Завершённые</option>
                <option value="blocked">🔴 Заблокированные</option>
                <option value="removed">⚫ Удалённые</option>
              </select>

              <select value={cityFilter} onChange={function (e) { setCityFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }}>
                <option value="all">Все города ({cities.length})</option>
                {cities.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
              </select>

              <select value={sortBy} onChange={function (e) { setSortBy(e.target.value); }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }}>
                <option value="responses">По откликам ↓</option>
                <option value="date">По дате ↓</option>
                <option value="salary">По зарплате ↓</option>
                <option value="views">По просмотрам ↓</option>
                <option value="title">По названию</option>
              </select>
            </div>

            {/* Vacancies Table */}
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Вакансия</th>
                    <th style={{ padding: "14px 12px", textAlign: "left", fontWeight: 600, color: "#374151", width: 140 }}>Город</th>
                    <th style={{ padding: "14px 12px", textAlign: "center", fontWeight: 600, color: "#374151", width: 110 }}>Зарплата</th>
                    <th style={{ padding: "14px 12px", textAlign: "center", fontWeight: 600, color: "#374151", width: 80 }}>👁</th>
                    <th style={{ padding: "14px 12px", textAlign: "center", fontWeight: 600, color: "#374151", width: 80 }}>💬</th>
                    <th style={{ padding: "14px 12px", textAlign: "center", fontWeight: 600, color: "#374151", width: 100 }}>Статус</th>
                    <th style={{ padding: "14px 12px", textAlign: "center", fontWeight: 600, color: "#374151", width: 100 }}>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={{ padding: 40, textAlign: "center", color: "#888" }}>⏳ Загрузка...</td></tr>
                  ) : paged.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: 40, textAlign: "center", color: "#888" }}>Нет вакансий</td></tr>
                  ) : paged.map(function (v) {
                    var st = statusLabel(v.status);
                    var hasResponses = (v.responses_count || 0) > 0;
                    return (
                      <tr key={v.id} onClick={function () { setSelectedVacancy(v); }}
                        style={{ borderBottom: "1px solid #f0f0f0", cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={function (e) { e.currentTarget.style.background = "#f8fafc"; }}
                        onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 600, color: "#111", marginBottom: 2 }}>{v.title}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>ID: {v.avito_id}</div>
                        </td>
                        <td style={{ padding: "14px 12px", color: "#555" }}>📍 {v.city || "—"}</td>
                        <td style={{ padding: "14px 12px", textAlign: "center", fontWeight: 600, color: "#059669" }}>
                          {v.salary_from ? formatMoney(v.salary_from) : "—"}
                        </td>
                        <td style={{ padding: "14px 12px", textAlign: "center", color: "#888" }}>{v.views || 0}</td>
                        <td style={{ padding: "14px 12px", textAlign: "center" }}>
                          <span style={{
                            display: "inline-block", padding: "4px 12px", borderRadius: 20, fontWeight: 700,
                            fontSize: 13,
                            background: hasResponses ? "#f5f3ff" : "#f3f4f6",
                            color: hasResponses ? "#7c3aed" : "#9ca3af",
                          }}>{v.responses_count || 0}</span>
                        </td>
                        <td style={{ padding: "14px 12px", textAlign: "center" }}>
                          <span style={{
                            display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12,
                            fontWeight: 600, background: st.bg, color: st.color,
                          }}>{st.text}</span>
                        </td>
                        <td style={{ padding: "14px 12px", textAlign: "center", fontSize: 12, color: "#888" }}>
                          {formatDateShort(v.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "16px", borderTop: "1px solid #f0f0f0" }}>
                  <button onClick={function () { setCurrentPage(Math.max(1, currentPage - 1)); }}
                    disabled={currentPage === 1}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 13 }}>←</button>
                  {Array.from({ length: Math.min(totalPages, 7) }, function (_, i) {
                    var p;
                    if (totalPages <= 7) { p = i + 1; }
                    else if (currentPage <= 4) { p = i + 1; }
                    else if (currentPage >= totalPages - 3) { p = totalPages - 6 + i; }
                    else { p = currentPage - 3 + i; }
                    return (
                      <button key={p} onClick={function () { setCurrentPage(p); }}
                        style={{
                          padding: "8px 14px", borderRadius: 8, border: "1px solid " + (currentPage === p ? "#6366f1" : "#e5e7eb"),
                          background: currentPage === p ? "#6366f1" : "#fff", color: currentPage === p ? "#fff" : "#374151",
                          cursor: "pointer", fontSize: 13, fontWeight: currentPage === p ? 700 : 400,
                        }}>{p}</button>
                    );
                  })}
                  <button onClick={function () { setCurrentPage(Math.min(totalPages, currentPage + 1)); }}
                    disabled={currentPage === totalPages}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 13 }}>→</button>
                  <span style={{ padding: "8px 12px", fontSize: 13, color: "#888" }}>Стр. {currentPage} из {totalPages}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== VACANCY DETAIL ===== */}
        {tab === "vacancies" && selectedVacancy && (
          <div>
            <button onClick={function () { setSelectedVacancy(null); }}
              style={{ background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 15, cursor: "pointer", marginBottom: 16, padding: 0 }}>
              ← Назад к списку
            </button>

            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22 }}>{selectedVacancy.title}</h2>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 14, color: "#666", flexWrap: "wrap" }}>
                    <span>📍 {selectedVacancy.city || "—"}</span>
                    <span>💰 {selectedVacancy.salary_from ? formatMoney(selectedVacancy.salary_from) : "—"}</span>
                    <span>👁 {selectedVacancy.views || 0} просмотров</span>
                    <span>💬 {selectedVacancy.responses_count || 0} откликов</span>
                    <span>📅 {formatDateShort(selectedVacancy.created_at)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {selectedVacancy.url && (
                    <a href={selectedVacancy.url} target="_blank" rel="noreferrer"
                      style={{
                        padding: "10px 20px", borderRadius: 10, background: "#6366f1", color: "#fff",
                        textDecoration: "none", fontWeight: 600, fontSize: 13,
                      }}>↗ На Авито</a>
                  )}
                  <span style={{
                    padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 13,
                    background: statusLabel(selectedVacancy.status).bg,
                    color: statusLabel(selectedVacancy.status).color,
                  }}>{statusLabel(selectedVacancy.status).text}</span>
                </div>
              </div>
            </div>

            {/* Responses for this vacancy */}
            <h3 style={{ fontSize: 18, marginBottom: 12 }}>💬 Отклики ({vacResponses.length})</h3>
            {vacResponses.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#888", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                Откликов пока нет
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {vacResponses.map(function (r) {
                  var info = parseCandidateInfo(r.message);
                  return (
                    <div key={r.id} style={{
                      background: "#fff", borderRadius: 14, padding: "16px 20px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: "50%", background: "#ede9fe",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, color: "#7c3aed", fontSize: 16,
                          }}>{(r.author_name || "?")[0].toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{r.author_name || "Без имени"}</div>
                            {info && info.fio && <div style={{ fontSize: 12, color: "#666" }}>📝 {info.fio}</div>}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>{formatDate(r.created_at)}</div>
                      </div>
                      {info && (
                        <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                          {info.age && <span style={{ padding: "4px 10px", borderRadius: 8, background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 500 }}>🎂 {info.age} лет</span>}
                          {info.citizenship && <span style={{ padding: "4px 10px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 500 }}>🌍 {info.citizenship}</span>}
                        </div>
                      )}
                      {r.message && (
                        <div style={{ fontSize: 13, color: "#555", whiteSpace: "pre-line", maxHeight: 120, overflow: "auto", background: "#f9fafb", borderRadius: 10, padding: 12 }}>
                          {r.message}
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
        {tab === "responses" && (
          <div>
            <div style={{
              display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap",
              background: "#fff", padding: "14px 16px", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <input placeholder="🔍 Поиск по имени или сообщению..." value={search}
                onChange={function (e) { setSearch(e.target.value); }}
                style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }} />
              <select value={responseFilter} onChange={function (e) { setResponseFilter(e.target.value); }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }}>
                <option value="all">Все отклики</option>
                <option value="new">🆕 Новые</option>
                <option value="contacted">📞 На связи</option>
                <option value="rejected">❌ Отклонены</option>
              </select>
              <div style={{ padding: "10px 14px", fontSize: 14, color: "#888" }}>Всего: {filteredResponses.length}</div>
            </div>

            {filteredResponses.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#888", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                Откликов нет
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredResponses.slice(0, 50).map(function (r) {
                  var info = parseCandidateInfo(r.message);
                  var raw = r.raw_data || {};
                  return (
                    <div key={r.id} style={{
                      background: "#fff", borderRadius: 14, padding: "16px 20px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 42, height: 42, borderRadius: "50%", background: "#ede9fe",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, color: "#7c3aed", fontSize: 17,
                          }}>{(r.author_name || "?")[0].toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{r.author_name || "Без имени"}</div>
                            {info && info.fio && <div style={{ fontSize: 13, color: "#444" }}>📝 {info.fio}</div>}
                            {raw.vacancy_title && <div style={{ fontSize: 12, color: "#888" }}>📋 {raw.vacancy_title}</div>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: "#888" }}>{formatDate(r.created_at)}</div>
                          {raw.location && raw.location.title && <div style={{ fontSize: 12, color: "#aaa" }}>📍 {raw.location.title}</div>}
                        </div>
                      </div>
                      {info && (
                        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          {info.age && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#f0fdf4", color: "#16a34a", fontSize: 12 }}>🎂 {info.age} лет</span>}
                          {info.citizenship && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12 }}>🌍 {info.citizenship}</span>}
                          {raw.price_string && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#fffbeb", color: "#d97706", fontSize: 12 }}>💰 {raw.price_string}</span>}
                        </div>
                      )}
                      {r.message && (
                        <div style={{ fontSize: 13, color: "#555", whiteSpace: "pre-line", maxHeight: 80, overflow: "hidden", background: "#f9fafb", borderRadius: 10, padding: 12 }}>
                          {r.message.slice(0, 300)}{r.message.length > 300 ? "..." : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== ACCOUNTS TAB ===== */}
        {tab === "accounts" && (
          <div>
            <button onClick={function () { setShowAddAccount(!showAddAccount); }}
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
                border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 600,
                fontSize: 14, cursor: "pointer", marginBottom: 16,
              }}>
              {showAddAccount ? "✕ Отмена" : "+ Добавить аккаунт"}
            </button>

            {showAddAccount && (
              <form onSubmit={addAccount} style={{
                background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Название</label>
                    <input value={accForm.name} onChange={function (e) { setAccForm(Object.assign({}, accForm, { name: e.target.value })); }}
                      placeholder="Мой аккаунт" required
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Client ID</label>
                    <input value={accForm.client_id} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_id: e.target.value })); }}
                      required
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Client Secret</label>
                    <input value={accForm.client_secret} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_secret: e.target.value })); }}
                      type="password" required
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                </div>
                <button type="submit" style={{
                  background: "#22c55e", color: "#fff", border: "none", borderRadius: 10,
                  padding: "10px 24px", fontWeight: 600, cursor: "pointer",
                }}>✅ Сохранить</button>
              </form>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {accounts.map(function (acc) {
                return (
                  <div key={acc.id} style={{
                    background: "#fff", borderRadius: 16, padding: "20px 24px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>⚙️ {acc.name}</div>
                      <div style={{ fontSize: 13, color: "#888" }}>
                        Client ID: {acc.client_id.slice(0, 8)}... | User ID: {acc.user_id || "—"}
                        {acc.token_expires_at && <span> | Токен до: {formatDateShort(acc.token_expires_at)}</span>}
                      </div>
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
