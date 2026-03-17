import { useState, useEffect } from "react";
import Head from "next/head";

function Modal({ candidate, onClose, onUpdate }) {
  var [tab, setTab] = useState("info");
  var [notes, setNotes] = useState([]);
  var [noteText, setNoteText] = useState("");
  var [form, setForm] = useState({
    candidate_name: candidate.candidate_name || "",
    candidate_age: candidate.candidate_age || "",
    candidate_gender: candidate.candidate_gender || "",
    candidate_citizenship: candidate.candidate_citizenship || "",
    phone: candidate.phone || ""
  });
  var [saving, setSaving] = useState(false);

  useEffect(function () {
    fetch("/api/avito/candidate/" + candidate.id).then(function (r) { return r.json(); }).then(function (d) { if (d.notes) setNotes(d.notes); });
  }, [candidate.id]);

  function saveField(field, value) {
    setSaving(true);
    var body = {};
    body[field] = value;
    fetch("/api/avito/candidate/" + candidate.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (d) { setSaving(false); if (d.candidate) onUpdate(d.candidate); });
  }

  function addNote() {
    if (!noteText.trim()) return;
    fetch("/api/avito/candidate/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response_id: candidate.id, text: noteText }) }).then(function (r) { return r.json(); }).then(function (d) { setNotes(d.notes); setNoteText(""); });
  }

  function deleteNote(noteId) {
    fetch("/api/avito/candidate/notes?id=" + noteId, { method: "DELETE" }).then(function () { setNotes(notes.filter(function (n) { return n.id !== noteId; })); });
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, width: "90%", maxWidth: 700, maxHeight: "90vh", overflow: "auto" }} onClick={function (e) { e.stopPropagation(); }}>
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "24px 32px", borderRadius: "16px 16px 0 0", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>{form.candidate_name || "Без имени"}</h2>
            <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: 14 }}>ID: {candidate.avito_chat_id}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: "flex", borderBottom: "2px solid #f0f0f0" }}>
          {["info", "notes", "message"].map(function (t) {
            var labels = { info: "📋 Информация", notes: "📝 Заметки (" + notes.length + ")", message: "💬 Сообщение" };
            return <button key={t} onClick={function () { setTab(t); }} style={{ flex: 1, padding: "12px", border: "none", background: tab === t ? "#667eea" : "white", color: tab === t ? "white" : "#666", cursor: "pointer", fontWeight: 600 }}>{labels[t]}</button>;
          })}
        </div>
        <div style={{ padding: "24px 32px" }}>
          {tab === "info" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#999", fontWeight: 600 }}>ИМЯ</label>
                  <input value={form.candidate_name} onChange={function (e) { setForm(Object.assign({}, form, { candidate_name: e.target.value })); }} onBlur={function () { saveField("candidate_name", form.candidate_name); }} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e8e8e8", borderRadius: 8, fontSize: 15, marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#999", fontWeight: 600 }}>ВОЗРАСТ</label>
                  <input value={form.candidate_age} onChange={function (e) { setForm(Object.assign({}, form, { candidate_age: e.target.value })); }} onBlur={function () { saveField("candidate_age", form.candidate_age); }} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e8e8e8", borderRadius: 8, fontSize: 15, marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#999", fontWeight: 600 }}>ПОЛ</label>
                  <select value={form.candidate_gender} onChange={function (e) { setForm(Object.assign({}, form, { candidate_gender: e.target.value })); saveField("candidate_gender", e.target.value); }} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e8e8e8", borderRadius: 8, fontSize: 15, marginTop: 4 }}>
                    <option value="">Не указан</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#999", fontWeight: 600 }}>ГРАЖДАНСТВО</label>
                  <input value={form.candidate_citizenship} onChange={function (e) { setForm(Object.assign({}, form, { candidate_citizenship: e.target.value })); }} onBlur={function () { saveField("candidate_citizenship", form.candidate_citizenship); }} style={{ width: "100%", padding: "10px 12px", border: "2px solid #e8e8e8", borderRadius: 8, fontSize: 15, marginTop: 4 }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, color: "#999", fontWeight: 600 }}>ТЕЛЕФОН</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <input value={form.phone} onChange={function (e) { setForm(Object.assign({}, form, { phone: e.target.value })); }} onBlur={function () { saveField("phone", form.phone); }} style={{ flex: 1, padding: "10px 12px", border: "2px solid #e8e8e8", borderRadius: 8, fontSize: 15 }} placeholder="+7..." />
                    <button onClick={function () { navigator.clipboard.writeText(form.phone); }} style={{ padding: "10px 16px", background: "#667eea", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>📋</button>
                    {form.phone && <a href={"tel:" + form.phone} style={{ padding: "10px 16px", background: "#4CAF50", color: "white", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>📞</a>}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20, padding: 16, background: "#f8f9ff", borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: "#999", fontWeight: 600 }}>ВАКАНСИЯ</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{candidate.vacancy_title || "—"}</div>
                <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{[candidate.vacancy_city, candidate.vacancy_address].filter(Boolean).join(", ")}</div>
              </div>
              {saving && <div style={{ marginTop: 8, color: "#667eea", fontSize: 13 }}>💾 Сохранение...</div>}
            </div>
          )}
          {tab === "notes" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input value={noteText} onChange={function (e) { setNoteText(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter") addNote(); }} placeholder="Добавить заметку..." style={{ flex: 1, padding: "10px 12px", border: "2px solid #e8e8e8", borderRadius: 8, fontSize: 15 }} />
                <button onClick={addNote} style={{ padding: "10px 20px", background: "#667eea", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Добавить</button>
              </div>
              {notes.length === 0 && <div style={{ textAlign: "center", color: "#999", padding: 32 }}>Заметок пока нет</div>}
              {notes.map(function (note) {
                return <div key={note.id} style={{ padding: 12, background: "#fffbeb", borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14 }}>{note.text}</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{new Date(note.created_at).toLocaleString("ru")}</div>
                  </div>
                  <button onClick={function () { deleteNote(note.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#999" }}>🗑</button>
                </div>;
              })}
            </div>
          )}
          {tab === "message" && (
            <div>
              <div style={{ padding: 16, background: "#f0f4ff", borderRadius: 12, fontSize: 14, lineHeight: 1.6 }}>{candidate.message || "Нет сообщений"}</div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#999" }}>Дата: {new Date(candidate.created_at).toLocaleString("ru")}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default function CRM() {
  var [responses, setResponses] = useState([]);
  var [loading, setLoading] = useState(true);
  var [syncing, setSyncing] = useState(false);
  var [activeTab, setActiveTab] = useState("inbox");
  var [search, setSearch] = useState("");
  var [sortBy, setSortBy] = useState("date");
  var [filterType, setFilterType] = useState("all");
  var [selectedCandidate, setSelectedCandidate] = useState(null);
  var [vacancyCount, setVacancyCount] = useState(0);
  var [accountCount, setAccountCount] = useState(0);

  useEffect(function () { loadData(); }, []);

  function loadData() {
    setLoading(true);
    fetch("/api/avito/responses").then(function (r) { return r.json(); }).then(function (d) { setResponses(d.responses || []); setLoading(false); });
    fetch("/api/avito/vacancies").then(function (r) { return r.json(); }).then(function (d) { setVacancyCount((d.vacancies || []).length); });
    fetch("/api/avito/accounts").then(function (r) { return r.json(); }).then(function (d) { setAccountCount((d.accounts || []).length); });
  }

  function doSync() {
    setSyncing(true);
    var pages = [0, 1, 2, 3, 4, 5];
    var i = 0;
    function next() {
      if (i >= pages.length) { setSyncing(false); loadData(); return; }
      fetch("/api/avito/sync?chat_page=" + pages[i]).then(function () { i++; next(); }).catch(function () { i++; next(); });
    }
    next();
  }

  function setStatus(id, status) {
    fetch("/api/avito/candidate/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: status }) }).then(function () {
      setResponses(responses.map(function (r) { if (r.id === id) return Object.assign({}, r, { status: status }); return r; }));
    });
  }

  function onCandidateUpdate(updated) {
    setResponses(responses.map(function (r) { if (r.id === updated.id) return updated; return r; }));
    setSelectedCandidate(updated);
  }

  var filtered = responses.filter(function (r) {
    if (activeTab === "inbox") return r.status === "new" || !r.status;
    if (activeTab === "working") return r.status === "working";
    if (activeTab === "scheduled") return r.status === "scheduled";
    if (activeTab === "rejected") return r.status === "rejected";
    return true;
  });

  if (search) {
    var s = search.toLowerCase();
    filtered = filtered.filter(function (r) {
      return (r.candidate_name || "").toLowerCase().includes(s) || (r.phone || "").includes(s) || (r.vacancy_title || "").toLowerCase().includes(s) || (r.message || "").toLowerCase().includes(s);
    });
  }
  if (filterType === "unread") filtered = filtered.filter(function (r) { return !r.is_read; });
  if (sortBy === "date") filtered.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  if (sortBy === "name") filtered.sort(function (a, b) { return (a.candidate_name || "").localeCompare(b.candidate_name || ""); });

  var counts = { inbox: 0, working: 0, scheduled: 0, rejected: 0, all: responses.length };
  responses.forEach(function (r) {
    if (r.status === "working") counts.working++;
    else if (r.status === "scheduled") counts.scheduled++;
    else if (r.status === "rejected") counts.rejected++;
    else counts.inbox++;
  });
  var unreadCount = responses.filter(function (r) { return !r.is_read; }).length;

  var tabs = [
    { key: "inbox", label: "Входящие", count: counts.inbox },
    { key: "working", label: "В работе", count: counts.working },
    { key: "scheduled", label: "Записаны", count: counts.scheduled },
    { key: "rejected", label: "Отказ", count: counts.rejected },
    { key: "all", label: "Все", count: counts.all },
    { key: "vacancies", label: "Вакансии", count: vacancyCount },
    { key: "settings", label: "Settings", count: accountCount }
  ];

  return (
    <>
      <Head><title>CRM Отклики</title></Head>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4ff 0%, #fce4ec 100%)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: 20 }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, color: "#1a1a2e" }}>CRM Отклики</h1>
              <p style={{ margin: "4px 0 0", color: "#666", fontSize: 14 }}>{unreadCount} непрочитанных | {responses.length} всего</p>
            </div>
            <button onClick={doSync} disabled={syncing} style={{ padding: "12px 32px", background: syncing ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none", borderRadius: 12, cursor: syncing ? "default" : "pointer", fontWeight: 700, fontSize: 16 }}>
              {syncing ? "⏳ Синхронизация..." : "🔄 Синхронизировать"}
            </button>
          </div>

          <div style={{ display: "flex", background: "white", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            {tabs.map(function (t) {
              return <button key={t.key} onClick={function () { setActiveTab(t.key); }} style={{ flex: 1, padding: "14px 8px", border: "none", background: activeTab === t.key ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "white", color: activeTab === t.key ? "white" : "#666", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>{t.label} <span style={{ marginLeft: 4, background: activeTab === t.key ? "rgba(255,255,255,0.3)" : "#f0f0f0", padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>{t.count}</span></button>;
            })}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <input value={search} onChange={function (e) { setSearch(e.target.value); }} placeholder="Поиск..." style={{ flex: 1, padding: "12px 16px", border: "2px solid #e8e8e8", borderRadius: 10, fontSize: 15 }} />
            <select value={filterType} onChange={function (e) { setFilterType(e.target.value); }} style={{ padding: "12px", border: "2px solid #e8e8e8", borderRadius: 10 }}>
              <option value="all">Все</option>
              <option value="unread">Непрочитанные</option>
            </select>
            <select value={sortBy} onChange={function (e) { setSortBy(e.target.value); }} style={{ padding: "12px", border: "2px solid #e8e8e8", borderRadius: 10 }}>
              <option value="date">По дате</option>
              <option value="name">По имени</option>
            </select>
            <span style={{ color: "#999", fontSize: 14, alignSelf: "center" }}>Найдено: {filtered.length}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[{ l: "Новые", c: counts.inbox, clr: "#667eea" }, { l: "В работе", c: counts.working, clr: "#ff9800" }, { l: "Записаны", c: counts.scheduled, clr: "#4CAF50" }, { l: "Отказ", c: counts.rejected, clr: "#f44336" }].map(function (s) {
              return <div key={s.l} style={{ background: "white", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}><span style={{ fontSize: 28, fontWeight: 800, color: s.clr }}>{s.c}</span><span style={{ marginLeft: 8, color: "#666" }}>{s.l}</span></div>;
            })}
          </div>

          {loading ? <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Загрузка...</div> : filtered.map(function (r) {
            var timeDiff = Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000);
            var timeStr = timeDiff < 60 ? timeDiff + "m" : timeDiff < 1440 ? Math.round(timeDiff / 60) + "h" : Math.round(timeDiff / 1440) + "d";
            var stColors = { working: "#ff9800", scheduled: "#4CAF50", rejected: "#f44336" };
            var stLabels = { working: "В работе", scheduled: "Записан", rejected: "Отказ" };

            return (
              <div key={r.id} style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: !r.is_read ? "4px solid #667eea" : "4px solid transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {!r.is_read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f44336", display: "inline-block" }}></span>}
                    <div onClick={function () { setSelectedCandidate(r); }} style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #ff9800, #ff5722)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, cursor: "pointer" }}>
                      {(r.candidate_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <span onClick={function () { setSelectedCandidate(r); }} style={{ fontWeight: 700, fontSize: 16, cursor: "pointer" }}>{r.candidate_name || "Без имени"}</span>
                      {(!r.status || r.status === "new") && <span style={{ marginLeft: 8, background: "#4CAF50", color: "white", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>NEW</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#999", fontSize: 13 }}>{timeStr}</span>
                    <span style={{ background: stColors[r.status] || "#667eea", color: "white", padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{stLabels[r.status] || "Новые"}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  {r.vacancy_title && <span style={{ background: "#f0f4ff", padding: "4px 10px", borderRadius: 6, fontSize: 12, color: "#667eea" }}>🏢 {r.vacancy_title.substring(0, 30)}</span>}
                  {r.candidate_age && <span style={{ background: "#fff3e0", padding: "4px 10px", borderRadius: 6, fontSize: 12, color: "#ff9800" }}>🎂 {r.candidate_age} лет</span>}
                  {r.phone && <span style={{ background: "#e8f5e9", padding: "4px 10px", borderRadius: 6, fontSize: 12, color: "#4CAF50" }}>📞 {r.phone}</span>}
                  {r.candidate_citizenship && <span style={{ background: "#fce4ec", padding: "4px 10px", borderRadius: 6, fontSize: 12, color: "#e91e63" }}>🌍 {r.candidate_citizenship}</span>}
                  <span style={{ background: "#f5f5f5", padding: "4px 10px", borderRadius: 6, fontSize: 12, color: "#999" }}>ID: {r.avito_chat_id}</span>
                </div>

                <div style={{ color: "#666", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#f8f9fa", borderRadius: 8 }}>
                  {(r.message || "Нет сообщения").substring(0, 200)}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#999" }}>Статус:</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={function () { setStatus(r.id, "new"); }} title="Новые" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #667eea", background: (!r.status || r.status === "new") ? "#667eea" : "white", cursor: "pointer", color: (!r.status || r.status === "new") ? "white" : "#667eea", fontSize: 14 }}>●</button>
                    <button onClick={function () { setStatus(r.id, "working"); }} title="В работе" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #ff9800", background: r.status === "working" ? "#ff9800" : "white", cursor: "pointer", color: r.status === "working" ? "white" : "#ff9800", fontSize: 14 }}>●</button>
                    <button onClick={function () { setStatus(r.id, "scheduled"); }} title="Записан" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #4CAF50", background: r.status === "scheduled" ? "#4CAF50" : "white", cursor: "pointer", color: r.status === "scheduled" ? "white" : "#4CAF50", fontSize: 14 }}>✔</button>
                    <button onClick={function () { setStatus(r.id, "rejected"); }} title="Отказ" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #f44336", background: r.status === "rejected" ? "#f44336" : "white", cursor: "pointer", color: r.status === "rejected" ? "white" : "#f44336", fontSize: 14 }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}

          {selectedCandidate && <Modal candidate={selectedCandidate} onClose={function () { setSelectedCandidate(null); }} onUpdate={onCandidateUpdate} />}
        </div>
      </div>
    </>
  );
}
