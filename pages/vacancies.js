import React, { useState, useEffect, useCallback, useRef } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
var S = require("../lib/strings");

function fmt(n) {
  if (!n) return "";
  return Number(n).toLocaleString("ru-RU") + " \u20BD";
}

function fmtDate(d) {
  if (!d) return "";
  var date = new Date(d);
  var now = new Date();
  var diff = now - date;
  var mins = Math.floor(diff / 60000);
  var hours = Math.floor(diff / 3600000);
  var days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m";
  if (hours < 24) return hours + "h";
  if (days < 7) return days + "d";
  return date.toLocaleDateString("ru-RU");
}

function fmtTime(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function fmtDT(ts) {
  if (!ts) return "";
  var d = new Date(ts * 1000);
  var today = new Date();
  if (d.toDateString() === today.toDateString()) return fmtTime(ts);
  var y = new Date(today); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "yesterday " + fmtTime(ts);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) + " " + fmtTime(ts);
}

var ST = {
  "new": { label: S.newOnes, icon: "\uD83D\uDD35", color: "#3b82f6", bg: "#eff6ff" },
  processing: { label: S.inWork, icon: "\uD83D\uDFE1", color: "#f59e0b", bg: "#fffbeb" },
  hired: { label: S.hired, icon: "\u2705", color: "#22c55e", bg: "#f0fdf4" },
  rejected: { label: S.rejected, icon: "\u274C", color: "#ef4444", bg: "#fef2f2" },
};

function stLabel(s) { return ST[s] || ST["new"]; }

function vacSt(s) {
  if (s === "active") return { text: "Active", color: "#22c55e", bg: "#f0fdf4" };
  if (s === "old") return { text: "Done", color: "#f59e0b", bg: "#fffbeb" };
  return { text: s || "-", color: "#6b7280", bg: "#f3f4f6" };
}

export default function VacanciesPage() {
  var _v = useState([]), vacancies = _v[0], setVacancies = _v[1];
  var _r = useState([]), responses = _r[0], setResponses = _r[1];
  var _a = useState([]), accounts = _a[0], setAccounts = _a[1];
  var _tab = useState("inbox"), tab = _tab[0], setTab = _tab[1];
  var _ld = useState(true), loading = _ld[0], setLoading = _ld[1];
  var _sy = useState(false), syncing = _sy[0], setSyncing = _sy[1];
  var _msg = useState(null), msg = _msg[0], setMsg = _msg[1];
  var _se = useState(""), search = _se[0], setSearch = _se[1];
  var _sf = useState("all"), statusFilter = _sf[0], setStatusFilter = _sf[1];
  var _sr = useState(null), selResp = _sr[0], setSelResp = _sr[1];
  var _cm = useState([]), chatMsgs = _cm[0], setChatMsgs = _cm[1];
  var _cl = useState(false), chatLoading = _cl[0], setChatLoading = _cl[1];
  var _ct = useState(""), chatText = _ct[0], setChatText = _ct[1];
  var _sn = useState(false), sending = _sn[0], setSending = _sn[1];
  var _sa = useState(false), showAdd = _sa[0], setShowAdd = _sa[1];
  var _af = useState({ name: "", client_id: "", client_secret: "" }), accForm = _af[0], setAccForm = _af[1];
  var _sv = useState(null), selVac = _sv[0], setSelVac = _sv[1];
  var _so = useState("date"), sortBy = _so[0], setSortBy = _so[1];
  var _vs = useState(""), vacSearch = _vs[0], setVacSearch = _vs[1];
  var chatEnd = useRef(null);

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
  useEffect(function () { if (chatEnd.current) chatEnd.current.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  function doSync() {
    setSyncing(true); setMsg(null);
    fetch("/api/avito/sync?mode=items").then(function (r) { return r.json(); }).then(function (d1) {
      var vc = d1.synced ? d1.synced.vacancies : 0;
      setMsg({ type: "success", text: "Vac: " + vc + "..." });
      var tR = 0; var pn = 0;
      function go() {
        fetch("/api/avito/sync?mode=chats&chat_page=" + pn).then(function (r) { return r.json(); }).then(function (d) {
          var b = d.synced ? d.synced.responses : 0; tR += b;
          setMsg({ type: "success", text: tR + " responses..." });
          if (b > 0 && !d.errors) { pn++; go(); }
          else { setSyncing(false); setMsg({ type: "success", text: vc + " vac, " + tR + " resp done" }); fetchData(); }
        }).catch(function () { setSyncing(false); fetchData(); });
      }
      go();
    }).catch(function (e) { setSyncing(false); setMsg({ type: "error", text: e.message }); });
  }

  function openResp(r) {
    setSelResp(r); setChatMsgs([]); setChatLoading(true); setChatText("");
    if (!r.is_read) {
      fetch("/api/avito/response-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, is_read: true, mark_read: true }) })
        .then(function () { setResponses(function (p) { return p.map(function (x) { return x.id === r.id ? Object.assign({}, x, { is_read: true }) : x; }); }); });
    }
    fetch("/api/avito/chat?chat_id=" + r.avito_chat_id + "&account_id=" + r.account_id)
      .then(function (res) { return res.json(); })
      .then(function (d) { if (d.ok) setChatMsgs(d.messages || []); setChatLoading(false); })
      .catch(function () { setChatLoading(false); });
  }

  function updStatus(id, st) {
    fetch("/api/avito/response-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id, status: st }) })
      .then(function () {
        setResponses(function (p) { return p.map(function (x) { return x.id === id ? Object.assign({}, x, { status: st }) : x; }); });
        if (selResp && selResp.id === id) setSelResp(Object.assign({}, selResp, { status: st }));
      });
  }

  function updNotes(id, n) {
    fetch("/api/avito/response-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id, notes: n }) });
  }

  function sendMsg() {
    if (!chatText.trim() || !selResp || sending) return;
    setSending(true);
    fetch("/api/avito/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: selResp.avito_chat_id, account_id: selResp.account_id, text: chatText.trim() }) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (d.ok) { setChatMsgs(function (p) { return p.concat([{ id: Date.now(), direction: "out", content: chatText.trim(), created: Math.floor(Date.now() / 1000) }]); }); setChatText(""); }
        setSending(false);
      }).catch(function () { setSending(false); });
  }

  function refreshChat() {
    if (!selResp) return; setChatLoading(true);
    fetch("/api/avito/chat?chat_id=" + selResp.avito_chat_id + "&account_id=" + selResp.account_id)
      .then(function (r) { return r.json(); }).then(function (d) { if (d.ok) setChatMsgs(d.messages || []); setChatLoading(false); })
      .catch(function () { setChatLoading(false); });
  }

  function addAcc(e) {
    e.preventDefault();
    fetch("/api/avito/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(accForm) })
      .then(function (r) { return r.json(); }).then(function (d) { if (d.ok) { setShowAdd(false); setAccForm({ name: "", client_id: "", client_secret: "" }); fetchData(); } });
  }

  function delAcc(id) {
    if (!confirm(S.deleteConfirm)) return;
    fetch("/api/avito/accounts?id=" + id, { method: "DELETE" }).then(function () { fetchData(); });
  }

  var unread = responses.filter(function (r) { return !r.is_read; }).length;
  var cNew = responses.filter(function (r) { return r.status === "new" || !r.status; }).length;
  var cProc = responses.filter(function (r) { return r.status === "processing"; }).length;
  var cHired = responses.filter(function (r) { return r.status === "hired"; }).length;
  var cRej = responses.filter(function (r) { return r.status === "rejected"; }).length;

  var filtered = responses.filter(function (r) {
    if (tab === "inbox") { if (statusFilter === "all") return r.status === "new" || !r.status || r.status === "processing"; return r.status === statusFilter; }
    if (tab === "hired") return r.status === "hired";
    if (tab === "rejected") return r.status === "rejected";
    if (tab === "all") { if (statusFilter !== "all") return r.status === statusFilter; return true; }
    return true;
  });
  if (selVac) filtered = filtered.filter(function (r) { return r.vacancy_id === selVac.id; });
  if (search) { var q = search.toLowerCase(); filtered = filtered.filter(function (r) { return (r.author_name || "").toLowerCase().indexOf(q) !== -1 || (r.candidate_name || "").toLowerCase().indexOf(q) !== -1 || (r.phone || "").indexOf(q) !== -1 || (r.vacancy_title || "").toLowerCase().indexOf(q) !== -1 || (r.message || "").toLowerCase().indexOf(q) !== -1; }); }
  filtered.sort(function (a, b) { if (sortBy === "unread") { if (!a.is_read && b.is_read) return -1; if (a.is_read && !b.is_read) return 1; } return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
    // RENDER
  var hdr = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 };
  var card = { background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" };
  var btn1 = { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer" };
  var pill = function(bg, color) { return { padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: bg, color: color }; };

  return (
    <DkrsAppShell>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>

        <div style={hdr}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>CRM {S.title}</h1>
            <p style={{ margin: "2px 0 0", color: "#888", fontSize: 13 }}>{unread} {S.unread} | {responses.length} {S.total}</p>
          </div>
          <button onClick={doSync} disabled={syncing} style={Object.assign({}, btn1, { opacity: syncing ? 0.7 : 1 })}>
            {syncing ? S.syncing : S.sync}
          </button>
        </div>

        {msg && (
          <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 500, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", color: msg.type === "success" ? "#16a34a" : "#dc2626", border: "1px solid " + (msg.type === "success" ? "#bbf7d0" : "#fecaca") }}>{msg.text}</div>
        )}

        {/* TABS */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
          {[
            { key: "inbox", label: S.inbox, count: cNew + cProc },
            { key: "hired", label: S.hired, count: cHired },
            { key: "rejected", label: S.rejected, count: cRej },
            { key: "all", label: S.all, count: responses.length },
            { key: "vacancies", label: S.vacancies, count: vacancies.length },
            { key: "accounts", label: "Settings", count: accounts.length },
          ].map(function (t) {
            var active = tab === t.key;
            return (
              <button key={t.key} onClick={function () { setTab(t.key); setSelResp(null); setSelVac(null); setSearch(""); setVacSearch(""); setStatusFilter("all"); }}
                style={{ flex: 1, padding: "12px 0", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: active ? "#6366f1" : "#fff", color: active ? "#fff" : "#374151" }}>
                {t.label}
                {t.count > 0 && <span style={{ marginLeft: 4, padding: "1px 7px", borderRadius: 10, fontSize: 11, background: active ? "rgba(255,255,255,0.25)" : "#f3f4f6", color: active ? "#fff" : "#6b7280" }}>{t.count}</span>}
              </button>
            );
          })}
        </div>

        {/* DETAIL VIEW */}
        {selResp && tab !== "vacancies" && tab !== "accounts" && (
          <div>
            <button onClick={function () { setSelResp(null); }} style={{ background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 10, padding: 0 }}>
              {S.back}
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, minHeight: 500 }}>

              {/* LEFT CARD */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 22 }}>
                      {(selResp.candidate_name || selResp.author_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17 }}>{selResp.candidate_name || selResp.author_name || S.noName}</div>
                      {selResp.author_name && selResp.author_name !== selResp.candidate_name && (
                        <div style={{ fontSize: 12, color: "#888" }}>Avito: {selResp.author_name}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selResp.phone && (
                      <a href={"tel:" + selResp.phone} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#22c55e", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
                        {selResp.phone}
                      </a>
                    )}
                    {selResp.candidate_age && <div style={{ padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", fontSize: 13 }}>{S.age}: {selResp.candidate_age} {S.years}</div>}
                    {selResp.candidate_citizenship && <div style={{ padding: "6px 12px", borderRadius: 8, background: "#eff6ff", fontSize: 13 }}>{selResp.candidate_citizenship}</div>}
                  </div>
                </div>

                <div style={card}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{S.vacancy}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{selResp.vacancy_title || "-"}</div>
                  {selResp.vacancy_code && <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>ID: {selResp.vacancy_code}</div>}
                  {selResp.vacancy_address && <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{selResp.vacancy_address}</div>}
                </div>

                <div style={card}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{S.status}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {Object.keys(ST).map(function (key) {
                      var s = ST[key]; var act = (selResp.status || "new") === key;
                      return (
                        <button key={key} onClick={function () { updStatus(selResp.id, key); }}
                          style={{ padding: "10px 8px", borderRadius: 10, border: act ? "2px solid " + s.color : "1px solid #e5e7eb", background: act ? s.bg : "#fff", cursor: "pointer", fontWeight: act ? 700 : 500, fontSize: 13, color: act ? s.color : "#374151" }}>
                          {s.icon} {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={card}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{S.notes}</div>
                  <textarea defaultValue={selResp.notes || ""} onBlur={function (e) { updNotes(selResp.id, e.target.value); }} placeholder={S.notesPlaceholder}
                    style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>
              </div>

              {/* RIGHT CHAT */}
              <div style={{ display: "flex", flexDirection: "column", background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{S.chat}</div>
                  <button onClick={refreshChat} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>Refresh</button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8, minHeight: 350, maxHeight: 450, background: "#f8fafc" }}>
                  {chatLoading ? (
                    <div style={{ textAlign: "center", color: "#888", paddingTop: 60 }}>{S.loading}</div>
                  ) : chatMsgs.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#888", paddingTop: 60 }}>{S.noMessages}</div>
                  ) : chatMsgs.map(function (m) {
                    var out = m.direction === "out";
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: 14, background: out ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#fff", color: out ? "#fff" : "#111", boxShadow: "0 1px 2px rgba(0,0,0,0.06)", borderBottomRightRadius: out ? 4 : 14, borderBottomLeftRadius: out ? 14 : 4 }}>
                          <div style={{ fontSize: 13, whiteSpace: "pre-line", lineHeight: 1.5 }}>{m.content}</div>
                          <div style={{ fontSize: 10, marginTop: 3, opacity: 0.6, textAlign: "right" }}>{fmtDT(m.created)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEnd} />
                </div>

                <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
                  <input value={chatText} onChange={function (e) { setChatText(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                    placeholder={S.msgPlaceholder}
                    style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 14, outline: "none" }} />
                  <button onClick={sendMsg} disabled={sending || !chatText.trim()}
                    style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: chatText.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#e5e7eb", color: chatText.trim() ? "#fff" : "#999", fontWeight: 700, fontSize: 14, cursor: chatText.trim() ? "pointer" : "default" }}>
                    {sending ? "..." : ">"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* RESPONSES LIST */}
        {!selResp && tab !== "vacancies" && tab !== "accounts" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, background: "#fff", padding: "12px 14px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexWrap: "wrap", alignItems: "center" }}>
              <input placeholder={S.searchPlaceholder} value={search} onChange={function (e) { setSearch(e.target.value); }}
                style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }} />
              {tab === "inbox" && (
                <select value={statusFilter} onChange={function (e) { setStatusFilter(e.target.value); }}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value="all">{S.allIncoming}</option>
                  <option value="new">{S.newOnes} ({cNew})</option>
                  <option value="processing">{S.inWork} ({cProc})</option>
                </select>
              )}
              {tab === "all" && (
                <select value={statusFilter} onChange={function (e) { setStatusFilter(e.target.value); }}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value="all">{S.allStatuses}</option>
                  <option value="new">{S.newOnes} ({cNew})</option>
                  <option value="processing">{S.inWork} ({cProc})</option>
                  <option value="hired">{S.hired} ({cHired})</option>
                  <option value="rejected">{S.rejected} ({cRej})</option>
                </select>
              )}
              <select value={sortBy} onChange={function (e) { setSortBy(e.target.value); }}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}>
                <option value="date">{S.byDate}</option>
                <option value="unread">{S.unreadFirst}</option>
              </select>
              {selVac && (
                <button onClick={function () { setSelVac(null); }}
                  style={{ padding: "10px 14px", borderRadius: 10, background: "#f5f3ff", color: "#6366f1", border: "1px solid #c7d2fe", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  X {selVac.title.slice(0, 30)}
                </button>
              )}
              <div style={{ fontSize: 13, color: "#888", padding: "10px 0" }}>{S.found}: {filtered.length}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: S.newOnes, count: cNew, color: "#3b82f6", bg: "#eff6ff" },
                { label: S.inWork, count: cProc, color: "#f59e0b", bg: "#fffbeb" },
                { label: S.hired, count: cHired, color: "#22c55e", bg: "#f0fdf4" },
                { label: S.rejected, count: cRej, color: "#ef4444", bg: "#fef2f2" },
              ].map(function (s, i) {
                return (
                  <div key={i} style={{ background: s.bg, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, border: "1px solid " + s.color + "22" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{s.label}</div>
                  </div>
                );
              })}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#888" }}>{S.loading}</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#fff", borderRadius: 16 }}>{S.noResponses}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.slice(0, 100).map(function (r) {
                  var st = stLabel(r.status || "new");
                  var ur = !r.is_read;
                  return (
                    <div key={r.id} onClick={function () { openResp(r); }}
                      style={{ background: ur ? "#fefce8" : "#fff", borderRadius: 14, padding: "14px 18px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: ur ? "2px solid #fbbf24" : "1px solid #f0f0f0", transition: "all 0.15s" }}
                      onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#6366f1"; }}
                      onMouseLeave={function (e) { e.currentTarget.style.borderColor = ur ? "#fbbf24" : "#f0f0f0"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <div style={{ width: 46, height: 46, borderRadius: "50%", background: ur ? "linear-gradient(135deg,#f59e0b,#f97316)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 18 }}>
                              {(r.candidate_name || r.author_name || "?")[0].toUpperCase()}
                            </div>
                            {ur && <div style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: "#ef4444", border: "2px solid #fff" }} />}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 15 }}>{r.candidate_name || r.author_name || S.noName}</span>
                              {ur && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "#fbbf24", color: "#78350f", fontWeight: 700 }}>NEW</span>}
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                              {r.phone && <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>{r.phone}</span>}
                              {r.candidate_age && <span style={{ fontSize: 11, color: "#888" }}>{r.candidate_age} {S.years}</span>}
                              {r.candidate_citizenship && <span style={{ fontSize: 11, color: "#888" }}>{r.candidate_citizenship}</span>}
                            </div>
                            <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, padding: "2px 8px", background: "#f5f3ff", borderRadius: 6 }}>{r.vacancy_title || "-"}</span>
                              {r.vacancy_code && <span style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>ID:{r.vacancy_code}</span>}
                              {(r.vacancy_address || r.vacancy_city) && <span style={{ fontSize: 10, color: "#888" }}>{r.vacancy_address || r.vacancy_city}</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontSize: 11, color: "#888" }}>{fmtDate(r.created_at)}</div>
                          <span style={pill(st.bg, st.color)}>{st.icon} {st.label}</span>
                          <div style={{ display: "flex", gap: 4 }}>
                            {Object.keys(ST).map(function (key) {
                              if ((r.status || "new") === key) return null;
                              var s2 = ST[key];
                              return (
                                <button key={key} title={s2.label} onClick={function (e) { e.stopPropagation(); updStatus(r.id, key); }}
                                  style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                                  {s2.icon}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {r.message && <div style={{ fontSize: 12, color: "#666", marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.message.slice(0, 150)}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VACANCIES TAB */}
        {tab === "vacancies" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, background: "#fff", padding: "12px 14px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", alignItems: "center" }}>
              <input placeholder={S.searchVacPlaceholder} value={vacSearch} onChange={function (e) { setVacSearch(e.target.value); }}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }} />
              <span style={{ fontSize: 13, color: "#888" }}>{S.totalVac}: {vacancies.length} | {S.active}: {vacancies.filter(function (v) { return v.status === "active"; }).length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vacancies.filter(function (v) {
                if (!vacSearch) return true;
                var q = vacSearch.toLowerCase();
                return (v.title || "").toLowerCase().indexOf(q) !== -1 || (v.city || "").toLowerCase().indexOf(q) !== -1 || String(v.avito_id).indexOf(q) !== -1;
              }).map(function (v) {
                var vs = vacSt(v.status);
                var rc = v.responses_count || 0;
                return (
                  <div key={v.id} onClick={function () { setSelVac(v); setTab("inbox"); setSearch(""); }}
                    style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", transition: "all 0.15s" }}
                    onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#6366f1"; }}
                    onMouseLeave={function (e) { e.currentTarget.style.borderColor = "#f0f0f0"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{v.title}</div>
                        <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "#888", flexWrap: "wrap" }}>
                          <span>{v.city || "-"}</span>
                          <span>{v.salary_from ? fmt(v.salary_from) : "-"}</span>
                          <span>ID: {v.avito_id}</span>
                          {v.url && <a href={v.url} target="_blank" rel="noreferrer" onClick={function (e) { e.stopPropagation(); }} style={{ color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>{S.avito}</a>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ padding: "6px 14px", borderRadius: 10, fontWeight: 700, fontSize: 14, background: rc > 0 ? "#f5f3ff" : "#f3f4f6", color: rc > 0 ? "#7c3aed" : "#9ca3af" }}>{rc}</span>
                        <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: vs.bg, color: vs.color }}>{vs.text}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {vacancies.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#fff", borderRadius: 16 }}>{S.noVacancies}</div>}
            </div>
          </div>
        )}

        {/* ACCOUNTS TAB */}
        {tab === "accounts" && (
          <div>
            <button onClick={function () { setShowAdd(!showAdd); }}
              style={Object.assign({}, btn1, { marginBottom: 14, fontSize: 13 })}>
              {showAdd ? S.cancel : S.addAccount}
            </button>
            {showAdd && (
              <form onSubmit={addAcc} style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>{S.nameLabel}</label>
                    <input value={accForm.name} onChange={function (e) { setAccForm(Object.assign({}, accForm, { name: e.target.value })); }} required
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>Client ID</label>
                    <input value={accForm.client_id} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_id: e.target.value })); }} required
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>Client Secret</label>
                    <input value={accForm.client_secret} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_secret: e.target.value })); }} type="password" required
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>
                <button type="submit" style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>{S.save}</button>
              </form>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {accounts.map(function (acc) {
                return (
                  <div key={acc.id} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{acc.name}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>ID: {(acc.client_id || "").slice(0, 8)}... | User: {acc.user_id || "-"}</div>
                    </div>
                    <button onClick={function () { delAcc(acc.id); }}
                      style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                      {S.deleteBtn}
                    </button>
                  </div>
                );
              })}
              {accounts.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#fff", borderRadius: 16 }}>{S.noAccounts}</div>}
            </div>
          </div>
        )}

      </div>
    </DkrsAppShell>
  );
}
