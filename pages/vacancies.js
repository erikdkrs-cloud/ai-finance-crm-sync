import React, { useState, useEffect, useCallback, useRef } from "react";
import DkrsAppShell from "../components/DkrsAppShell";

// All Russian strings as plain vars to avoid unicode escape issues
var T_TITLE = "CRM \u041e\u0442\u043a\u043b\u0438\u043a\u0438";
var T_UNREAD = "\u043d\u0435\u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043d\u044b\u0445";
var T_TOTAL = "\u0432\u0441\u0435\u0433\u043e";
var T_SYNC = "\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u0442\u044c";
var T_SYNCING = "\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u044f...";
var T_INBOX = "\u0412\u0445\u043e\u0434\u044f\u0449\u0438\u0435";
var T_HIRED = "\u0417\u0430\u043f\u0438\u0441\u0430\u043d\u044b";
var T_REJECTED = "\u041e\u0442\u043a\u0430\u0437";
var T_ALL = "\u0412\u0441\u0435";
var T_VAC = "\u0412\u0430\u043a\u0430\u043d\u0441\u0438\u0438";
var T_BACK = "\u041d\u0430\u0437\u0430\u0434 \u043a \u0441\u043f\u0438\u0441\u043a\u0443";
var T_CHAT = "\u0427\u0430\u0442";
var T_LOAD = "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...";
var T_NOMSG = "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0439 \u043d\u0435\u0442";
var T_MSGPH = "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435...";
var T_SEARCH = "\u041f\u043e\u0438\u0441\u043a...";
var T_ALLINC = "\u0412\u0441\u0435 \u0432\u0445\u043e\u0434\u044f\u0449\u0438\u0435";
var T_NEW = "\u041d\u043e\u0432\u044b\u0435";
var T_INWORK = "\u0412 \u0440\u0430\u0431\u043e\u0442\u0435";
var T_BYDATE = "\u041f\u043e \u0434\u0430\u0442\u0435";
var T_UNRFIRST = "\u041d\u0435\u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043d\u044b\u0435";
var T_FOUND = "\u041d\u0430\u0439\u0434\u0435\u043d\u043e";
var T_NORESP = "\u041d\u0435\u0442 \u043e\u0442\u043a\u043b\u0438\u043a\u043e\u0432";
var T_VACANCY = "\u0412\u0430\u043a\u0430\u043d\u0441\u0438\u044f";
var T_STATUS = "\u0421\u0442\u0430\u0442\u0443\u0441";
var T_NOTES = "\u0417\u0430\u043c\u0435\u0442\u043a\u0438";
var T_NOTESPH = "\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0437\u0430\u043c\u0435\u0442\u043a\u0443...";
var T_NONAME = "\u0411\u0435\u0437 \u0438\u043c\u0435\u043d\u0438";
var T_AGE = "\u0412\u043e\u0437\u0440\u0430\u0441\u0442";
var T_YEARS = "\u043b\u0435\u0442";
var T_ALLST = "\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044b";
var T_ADD = "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c";
var T_CANCEL = "\u041e\u0442\u043c\u0435\u043d\u0430";
var T_SAVE = "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c";
var T_NAME = "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435";
var T_DEL = "\u0423\u0434\u0430\u043b\u0438\u0442\u044c";
var T_DELCONF = "\u0423\u0434\u0430\u043b\u0438\u0442\u044c?";
var T_NOACC = "\u041d\u0435\u0442 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u043e\u0432";
var T_NOVAC = "\u041d\u0435\u0442 \u0432\u0430\u043a\u0430\u043d\u0441\u0438\u0439";
var T_ADDR = "\u0410\u0434\u0440\u0435\u0441";
var T_PHONE = "\u0422\u0435\u043b\u0435\u0444\u043e\u043d";
var T_CITIZEN = "\u0413\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u0442\u0432\u043e";

function fmt(n) { if (!n) return ""; return Number(n).toLocaleString("ru-RU") + " \u20BD"; }
function fmtDate(d) {
  if (!d) return ""; var date = new Date(d); var now = new Date(); var diff = now - date;
  var m = Math.floor(diff / 60000); var h = Math.floor(diff / 3600000); var dd = Math.floor(diff / 86400000);
  if (m < 1) return "now"; if (m < 60) return m + "m"; if (h < 24) return h + "h"; if (dd < 7) return dd + "d";
  return date.toLocaleDateString("ru-RU");
}
function fmtTime(ts) { if (!ts) return ""; return new Date(ts * 1000).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); }
function fmtDT(ts) {
  if (!ts) return ""; var d = new Date(ts * 1000); var today = new Date();
  if (d.toDateString() === today.toDateString()) return fmtTime(ts);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) + " " + fmtTime(ts);
}

var ST = {
  "new": { label: T_NEW, icon: "\uD83D\uDD35", color: "#3b82f6", bg: "#eff6ff" },
  processing: { label: T_INWORK, icon: "\uD83D\uDFE1", color: "#f59e0b", bg: "#fffbeb" },
  hired: { label: T_HIRED, icon: "\u2705", color: "#22c55e", bg: "#f0fdf4" },
  rejected: { label: T_REJECTED, icon: "\u274C", color: "#ef4444", bg: "#fef2f2" },
};
function stLabel(s) { return ST[s] || ST["new"]; }

export default function VacanciesPage() {
  var _v = useState([]), vacancies = _v[0], setVacancies = _v[1];
  var _r = useState([]), responses = _r[0], setResponses = _r[1];
  var _a = useState([]), accounts = _a[0], setAccounts = _a[1];
  var _tab = useState("inbox"), tab = _tab[0], setTab = _tab[1];
  var _ld = useState(true), loading = _ld[0], setLoading = _ld[1];
  var _sy = useState(false), syncing = _sy[0], setSyncing = _sy[1];
  var _msg = useState(null), xmsg = _msg[0], setXmsg = _msg[1];
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
      setVacancies(res[0].data || []); setResponses(res[1].data || []); setAccounts(res[2].data || []);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, []);

  useEffect(function () { fetchData(); }, [fetchData]);
  useEffect(function () { if (chatEnd.current) chatEnd.current.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  function doSync() {
    setSyncing(true); setXmsg(null);
    fetch("/api/avito/sync?mode=items").then(function (r) { return r.json(); }).then(function (d1) {
      var vc = d1.synced ? d1.synced.vacancies : 0;
      setXmsg({ type: "success", text: "Vac: " + vc + "..." });
      var tR = 0; var pn = 0;
      function go() {
        fetch("/api/avito/sync?mode=chats&chat_page=" + pn).then(function (r) { return r.json(); }).then(function (d) {
          var b = d.synced ? d.synced.responses : 0; tR += b;
          setXmsg({ type: "success", text: tR + " responses..." });
          if (b > 0 && !d.errors) { pn++; go(); }
          else { setSyncing(false); setXmsg({ type: "success", text: vc + " vac, " + tR + " resp" }); fetchData(); }
        }).catch(function () { setSyncing(false); fetchData(); });
      }
      go();
    }).catch(function (e) { setSyncing(false); setXmsg({ type: "error", text: e.message }); });
  }

  function openResp(r) {
    setSelResp(r); setChatMsgs([]); setChatLoading(true); setChatText("");
    if (!r.is_read) {
      fetch("/api/avito/response-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, is_read: true, mark_read: true }) })
        .then(function () { setResponses(function (p) { return p.map(function (x) { return x.id === r.id ? Object.assign({}, x, { is_read: true }) : x; }); }); });
    }
    fetch("/api/avito/chat?chat_id=" + r.avito_chat_id + "&account_id=" + r.account_id)
      .then(function (res) { return res.json(); }).then(function (d) { if (d.ok) setChatMsgs(d.messages || []); setChatLoading(false); })
      .catch(function () { setChatLoading(false); });
  }

  function updStatus(id, st) {
    fetch("/api/avito/response-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id, status: st }) })
      .then(function () {
        setResponses(function (p) { return p.map(function (x) { return x.id === id ? Object.assign({}, x, { status: st }) : x; }); });
        if (selResp && selResp.id === id) setSelResp(Object.assign({}, selResp, { status: st }));
      });
  }
  function updNotes(id, n) { fetch("/api/avito/response-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id, notes: n }) }); }

  function sendMsg() {
    if (!chatText.trim() || !selResp || sending) return; setSending(true);
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
  function delAcc(id) { if (!confirm(T_DELCONF)) return; fetch("/api/avito/accounts?id=" + id, { method: "DELETE" }).then(function () { fetchData(); }); }

    function getAddr(r) {
    if (r.vacancy_address && r.vacancy_address.length > 3) return r.vacancy_address;
    var v = vacancies.find(function (vv) { return vv.id === r.vacancy_id; });
    if (v) {
      if (v.raw_data && v.raw_data.address) return v.raw_data.address;
      if (v.address) return v.address;
      if (v.city) return v.city;
    }
    return r.vacancy_city || "";
  }

  function getVacTitle(r) {
    if (r.vacancy_title && r.vacancy_title.length > 1) return r.vacancy_title;
    var v = vacancies.find(function (vv) { return vv.id === r.vacancy_id; });
    return v ? v.title : "-";
  }

  function getVacCode(r) {
    var code = r.vacancy_code;
    if (!code) return "";
    if (typeof code === "object") return String(code.id || code.value || JSON.stringify(code));
    return String(code);
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
  if (search) { var q = search.toLowerCase(); filtered = filtered.filter(function (r) { return (r.author_name || "").toLowerCase().indexOf(q) !== -1 || (r.candidate_name || "").toLowerCase().indexOf(q) !== -1 || (r.phone || "").indexOf(q) !== -1 || (r.vacancy_title || "").toLowerCase().indexOf(q) !== -1; }); }
  filtered.sort(function (a, b) { if (sortBy === "unread") { if (!a.is_read && b.is_read) return -1; if (a.is_read && !b.is_read) return 1; } return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
    var B1 = { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer" };
  var CD = { background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" };

  return (
    <DkrsAppShell>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>{T_TITLE}</h1>
            <p style={{ margin: "2px 0 0", color: "#888", fontSize: 13 }}>{unread} {T_UNREAD} | {responses.length} {T_TOTAL}</p>
          </div>
          <button onClick={doSync} disabled={syncing} style={Object.assign({}, B1, { opacity: syncing ? 0.7 : 1 })}>{syncing ? T_SYNCING : T_SYNC}</button>
        </div>

        {xmsg && <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 500, background: xmsg.type === "success" ? "#f0fdf4" : "#fef2f2", color: xmsg.type === "success" ? "#16a34a" : "#dc2626" }}>{xmsg.text}</div>}

        <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
          {[
            { key: "inbox", label: T_INBOX, count: cNew + cProc },
            { key: "hired", label: T_HIRED, count: cHired },
            { key: "rejected", label: T_REJECTED, count: cRej },
            { key: "all", label: T_ALL, count: responses.length },
            { key: "vacancies", label: T_VAC, count: vacancies.length },
            { key: "accounts", label: "Settings", count: accounts.length },
          ].map(function (t) {
            var ac = tab === t.key;
            return (<button key={t.key} onClick={function () { setTab(t.key); setSelResp(null); setSelVac(null); setSearch(""); setVacSearch(""); setStatusFilter("all"); }}
              style={{ flex: 1, padding: "12px 0", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: ac ? "#6366f1" : "#fff", color: ac ? "#fff" : "#374151" }}>
              {t.label}{t.count > 0 && <span style={{ marginLeft: 4, padding: "1px 7px", borderRadius: 10, fontSize: 11, background: ac ? "rgba(255,255,255,0.25)" : "#f3f4f6" }}>{t.count}</span>}
            </button>);
          })}
        </div>

        {/* DETAIL */}
        {selResp && tab !== "vacancies" && tab !== "accounts" && (
          <div>
            <button onClick={function () { setSelResp(null); }} style={{ background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 10, padding: 0 }}>{T_BACK}</button>
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, minHeight: 500 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={CD}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 22 }}>{(selResp.candidate_name || selResp.author_name || "?")[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17 }}>{selResp.candidate_name || selResp.author_name || T_NONAME}</div>
                      {selResp.author_name && selResp.author_name !== selResp.candidate_name && <div style={{ fontSize: 12, color: "#888" }}>Avito: {selResp.author_name}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selResp.phone && <a href={"tel:" + selResp.phone} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#22c55e", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 15 }}>{selResp.phone}</a>}
                    {selResp.candidate_age && <div style={{ padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", fontSize: 13 }}>{T_AGE}: {selResp.candidate_age} {T_YEARS}</div>}
                    {selResp.candidate_citizenship && <div style={{ padding: "6px 12px", borderRadius: 8, background: "#eff6ff", fontSize: 13 }}>{selResp.candidate_citizenship}</div>}
                  </div>
                </div>
                <div style={CD}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>{T_VACANCY}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{selResp.vacancy_title || "-"}</div>
                  {selResp.vacancy_code && <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>ID: {selResp.vacancy_code}</div>}
                  {getAddr(selResp) && <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{getAddr(selResp)}</div>}
                </div>
                <div style={CD}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>{T_STATUS}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {Object.keys(ST).map(function (key) {
                      var s = ST[key]; var act = (selResp.status || "new") === key;
                      return (<button key={key} onClick={function () { updStatus(selResp.id, key); }}
                        style={{ padding: "10px 8px", borderRadius: 10, border: act ? "2px solid " + s.color : "1px solid #e5e7eb", background: act ? s.bg : "#fff", cursor: "pointer", fontWeight: act ? 700 : 500, fontSize: 13, color: act ? s.color : "#374151" }}>{s.icon} {s.label}</button>);
                    })}
                  </div>
                </div>
                <div style={CD}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>{T_NOTES}</div>
                  <textarea defaultValue={selResp.notes || ""} onBlur={function (e) { updNotes(selResp.id, e.target.value); }} placeholder={T_NOTESPH}
                    style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{T_CHAT}</div>
                  <button onClick={refreshChat} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>Refresh</button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8, minHeight: 350, maxHeight: 450, background: "#f8fafc" }}>
                  {chatLoading ? <div style={{ textAlign: "center", color: "#888", paddingTop: 60 }}>{T_LOAD}</div>
                  : chatMsgs.length === 0 ? <div style={{ textAlign: "center", color: "#888", paddingTop: 60 }}>{T_NOMSG}</div>
                  : chatMsgs.map(function (m) {
                    var out = m.direction === "out";
                    return (<div key={m.id} style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: 14, background: out ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#fff", color: out ? "#fff" : "#111", boxShadow: "0 1px 2px rgba(0,0,0,0.06)", borderBottomRightRadius: out ? 4 : 14, borderBottomLeftRadius: out ? 14 : 4 }}>
                        <div style={{ fontSize: 13, whiteSpace: "pre-line", lineHeight: 1.5 }}>{m.content}</div>
                        <div style={{ fontSize: 10, marginTop: 3, opacity: 0.6, textAlign: "right" }}>{fmtDT(m.created)}</div>
                      </div></div>);
                  })}
                  <div ref={chatEnd} />
                </div>
                <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
                  <input value={chatText} onChange={function (e) { setChatText(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }} placeholder={T_MSGPH}
                    style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 14, outline: "none" }} />
                  <button onClick={sendMsg} disabled={sending || !chatText.trim()}
                    style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: chatText.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#e5e7eb", color: chatText.trim() ? "#fff" : "#999", fontWeight: 700, fontSize: 14, cursor: chatText.trim() ? "pointer" : "default" }}>
                    {sending ? "..." : ">"}</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* RESPONSES LIST */}
        {!selResp && tab !== "vacancies" && tab !== "accounts" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, background: "#fff", padding: "12px 14px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexWrap: "wrap", alignItems: "center" }}>
              <input placeholder={T_SEARCH} value={search} onChange={function (e) { setSearch(e.target.value); }}
                style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }} />
              {(tab === "inbox" || tab === "all") && (
                <select value={statusFilter} onChange={function (e) { setStatusFilter(e.target.value); }}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}>
                  <option value="all">{tab === "inbox" ? T_ALLINC : T_ALLST}</option>
                  <option value="new">{T_NEW} ({cNew})</option>
                  <option value="processing">{T_INWORK} ({cProc})</option>
                  {tab === "all" && <option value="hired">{T_HIRED} ({cHired})</option>}
                  {tab === "all" && <option value="rejected">{T_REJECTED} ({cRej})</option>}
                </select>
              )}
              <select value={sortBy} onChange={function (e) { setSortBy(e.target.value); }}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}>
                <option value="date">{T_BYDATE}</option>
                <option value="unread">{T_UNRFIRST}</option>
              </select>
              {selVac && (
                <button onClick={function () { setSelVac(null); }}
                  style={{ padding: "10px 14px", borderRadius: 10, background: "#f5f3ff", color: "#6366f1", border: "1px solid #c7d2fe", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  X {selVac.title.slice(0, 30)}</button>
              )}
              <div style={{ fontSize: 13, color: "#888", padding: "10px 0" }}>{T_FOUND}: {filtered.length}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: T_NEW, count: cNew, color: "#3b82f6", bg: "#eff6ff" },
                { label: T_INWORK, count: cProc, color: "#f59e0b", bg: "#fffbeb" },
                { label: T_HIRED, count: cHired, color: "#22c55e", bg: "#f0fdf4" },
                { label: T_REJECTED, count: cRej, color: "#ef4444", bg: "#fef2f2" },
              ].map(function (s, i) {
                return (<div key={i} style={{ background: s.bg, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, border: "1px solid " + s.color + "22" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{s.label}</div>
                </div>);
              })}
            </div>

            {loading ? <div style={{ textAlign: "center", padding: 40, color: "#888" }}>{T_LOAD}</div>
            : filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#fff", borderRadius: 16 }}>{T_NORESP}</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.slice(0, 100).map(function (r) {
                  var st = stLabel(r.status || "new");
                  var ur = !r.is_read;
                  var addr = getAddr(r);
                  return (
                    <div key={r.id} style={{
                      background: "#fff", borderRadius: 18, padding: 0, cursor: "pointer",
                      boxShadow: ur ? "0 2px 16px rgba(251,191,36,0.18)" : "0 2px 12px rgba(99,102,241,0.07)",
                      border: ur ? "2.5px solid #fbbf24" : "1.5px solid #eee",
                      transition: "all 0.22s cubic-bezier(.4,0,.2,1)", overflow: "hidden", position: "relative",
                    }}
                    onMouseEnter={function (e) { e.currentTarget.style.transform = "translateY(-3px) scale(1.007)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.16)"; e.currentTarget.style.borderColor = "#6366f1"; }}
                    onMouseLeave={function (e) { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ur ? "0 2px 16px rgba(251,191,36,0.18)" : "0 2px 12px rgba(99,102,241,0.07)"; e.currentTarget.style.borderColor = ur ? "#fbbf24" : "#eee"; }}
                    >
                      <div style={{ height: 4, background: ur ? "linear-gradient(90deg,#fbbf24,#f97316)" : "linear-gradient(90deg," + st.color + "," + st.color + "44)", borderRadius: "18px 18px 0 0" }} />

                      <div style={{ padding: "16px 20px" }} onClick={function () { openResp(r); }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ position: "relative", flexShrink: 0 }}>
                              <div style={{ width: 52, height: 52, borderRadius: "50%",
                                background: ur ? "linear-gradient(135deg,#f59e0b,#f97316)" : "linear-gradient(135deg,#6366f1,#a78bfa)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: 800, color: "#fff", fontSize: 20,
                                boxShadow: "0 3px 12px " + (ur ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.25)"),
                              }}>{(r.candidate_name || r.author_name || "?")[0].toUpperCase()}</div>
                              {ur && <div style={{ position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", border: "2.5px solid #fff", boxShadow: "0 0 6px rgba(239,68,68,0.5)" }} />}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 800, fontSize: 17, color: "#111" }}>{r.candidate_name || r.author_name || T_NONAME}</span>
                                {ur && <span style={{ fontSize: 10, padding: "2px 10px", borderRadius: 6, background: "linear-gradient(135deg,#fbbf24,#f97316)", color: "#fff", fontWeight: 700 }}>NEW</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>{fmtDate(r.created_at)}</div>
                            <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: st.bg, color: st.color, border: "1px solid " + st.color + "33" }}>{st.icon} {st.label}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "1px solid #e0d7fe" }}>
                            <span style={{ fontSize: 14 }}>{"\uD83D\uDCBC"}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#6d28d9", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.vacancy_title || "-"}</span>
                          </div>
                          {addr && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a" }}>
                              <span style={{ fontSize: 14 }}>{"\uD83D\uDCCD"}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>{addr}</span>
                            </div>
                          )}
                          {r.phone && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac" }}>
                              <span style={{ fontSize: 14 }}>{"\uD83D\uDCDE"}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>{r.phone}</span>
                            </div>
                          )}
                          {r.candidate_age && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, background: "#e0f2fe", border: "1px solid #7dd3fc" }}>
                              <span style={{ fontSize: 14 }}>{"\uD83C\uDF82"}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#0c4a6e" }}>{r.candidate_age} {T_YEARS}</span>
                            </div>
                          )}
                          {r.candidate_citizenship && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, background: "#fce7f3", border: "1px solid #f9a8d4" }}>
                              <span style={{ fontSize: 14 }}>{"\uD83C\uDF0D"}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#9d174d" }}>{r.candidate_citizenship}</span>
                            </div>
                          )}
                          {r.vacancy_code && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ID: {r.vacancy_code}</span>
                            </div>
                          )}
                        </div>

                        {r.message && (
                          <div style={{ fontSize: 13, color: "#777", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "8px 12px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f0f0f0" }}>{r.message.slice(0, 160)}</div>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, padding: "8px 20px 14px", borderTop: "1px solid #f5f5f5" }}>
                        <span style={{ fontSize: 11, color: "#bbb", marginRight: "auto", fontWeight: 500 }}>{T_STATUS}:</span>
                        {Object.keys(ST).map(function (key) {
                          var s2 = ST[key]; var isA = (r.status || "new") === key;
                          return (<button key={key} title={s2.label}
                            onClick={function (e) { e.stopPropagation(); updStatus(r.id, key); }}
                            style={{
                              width: isA ? "auto" : 34, height: 34, borderRadius: 10,
                              border: isA ? "2px solid " + s2.color : "1.5px solid #e5e7eb",
                              background: isA ? s2.bg : "#fff", cursor: "pointer",
                              fontSize: isA ? 12 : 15, fontWeight: isA ? 700 : 400, color: isA ? s2.color : "#666",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              gap: 4, padding: isA ? "0 12px" : 0,
                              transition: "all 0.18s ease",
                              boxShadow: isA ? "0 2px 8px " + s2.color + "22" : "none",
                            }}
                            onMouseEnter={function (e) { if (!isA) { e.currentTarget.style.background = s2.bg; e.currentTarget.style.borderColor = s2.color; e.currentTarget.style.transform = "scale(1.12)"; } }}
                            onMouseLeave={function (e) { if (!isA) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = ""; } }}
                          >{s2.icon} {isA && s2.label}</button>);
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VACANCIES */}
        {tab === "vacancies" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, background: "#fff", padding: "12px 14px", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", alignItems: "center" }}>
              <input placeholder={T_SEARCH} value={vacSearch} onChange={function (e) { setVacSearch(e.target.value); }}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }} />
              <span style={{ fontSize: 13, color: "#888" }}>{T_TOTAL}: {vacancies.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vacancies.filter(function (v) {
                if (!vacSearch) return true; var qq = vacSearch.toLowerCase();
                return (v.title || "").toLowerCase().indexOf(qq) !== -1 || (v.city || "").toLowerCase().indexOf(qq) !== -1 || String(v.avito_id).indexOf(qq) !== -1;
              }).map(function (v) {
                var rc = v.responses_count || 0;
                return (<div key={v.id} onClick={function () { setSelVac(v); setTab("inbox"); setSearch(""); }}
                  style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", transition: "all 0.15s" }}
                  onMouseEnter={function (e) { e.currentTarget.style.borderColor = "#6366f1"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.borderColor = "#f0f0f0"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{v.title}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "#888", flexWrap: "wrap" }}>
                        <span>{v.address || v.city || "-"}</span>
                        <span>{v.salary_from ? fmt(v.salary_from) : ""}</span>
                        <span>ID: {v.avito_id}</span>
                        {v.url && <a href={v.url} target="_blank" rel="noreferrer" onClick={function (e) { e.stopPropagation(); }} style={{ color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>Avito</a>}
                      </div>
                    </div>
                    <span style={{ padding: "6px 14px", borderRadius: 10, fontWeight: 700, fontSize: 14, background: rc > 0 ? "#f5f3ff" : "#f3f4f6", color: rc > 0 ? "#7c3aed" : "#9ca3af" }}>{rc}</span>
                  </div>
                </div>);
              })}
              {vacancies.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#fff", borderRadius: 16 }}>{T_NOVAC}</div>}
            </div>
          </div>
        )}

        {/* ACCOUNTS */}
        {tab === "accounts" && (
          <div>
            <button onClick={function () { setShowAdd(!showAdd); }} style={Object.assign({}, B1, { marginBottom: 14, fontSize: 13 })}>{showAdd ? T_CANCEL : T_ADD}</button>
            {showAdd && (
              <form onSubmit={addAcc} style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>{T_NAME}</label>
                    <input value={accForm.name} onChange={function (e) { setAccForm(Object.assign({}, accForm, { name: e.target.value })); }} required style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>Client ID</label>
                    <input value={accForm.client_id} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_id: e.target.value })); }} required style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>Client Secret</label>
                    <input value={accForm.client_secret} onChange={function (e) { setAccForm(Object.assign({}, accForm, { client_secret: e.target.value })); }} type="password" required style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }} /></div>
                </div>
                <button type="submit" style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>{T_SAVE}</button>
              </form>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {accounts.map(function (acc) {
                return (<div key={acc.id} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{acc.name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>ID: {(acc.client_id || "").slice(0, 8)}... | User: {acc.user_id || "-"}</div>
                  </div>
                  <button onClick={function () { delAcc(acc.id); }} style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>{T_DEL}</button>
                </div>);
              })}
              {accounts.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#fff", borderRadius: 16 }}>{T_NOACC}</div>}
            </div>
          </div>
        )}

      </div>
    </DkrsAppShell>
  );
}
