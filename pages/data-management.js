import React, { useState, useEffect } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import { useAuth } from "../components/AuthProvider";

export default function DataManagementPage() {
  var auth = useAuth();
  var _mounted = useState(false), mounted = _mounted[0], setMounted = _mounted[1];
  var _projects = useState([]), projects = _projects[0], setProjects = _projects[1];
  var _periods = useState([]), periods = _periods[0], setPeriods = _periods[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _msg = useState(""), msg = _msg[0], setMsg = _msg[1];
  var _tab = useState("projects"), tab = _tab[0], setTab = _tab[1];

  useEffect(function () { setMounted(true); loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      var pRes = await fetch("/api/data-management?action=projects");
      var pJson = await pRes.json();
      if (pJson.ok) setProjects(pJson.projects || []);

      var mRes = await fetch("/api/data-management?action=periods");
      var mJson = await mRes.json();
      if (mJson.ok) setPeriods(mJson.periods || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function deleteProject(id, name) {
    if (!confirm("Удалить проект «" + name + "» и все его данные?")) return;
    setMsg("");
    try {
      var res = await fetch("/api/data-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-project", project_id: id }),
      });
      var json = await res.json();
      if (json.ok) {
        setMsg("✅ Проект «" + name + "» удалён");
        loadData();
      } else {
        setMsg("❌ " + (json.error || "Ошибка"));
      }
    } catch (e) { setMsg("❌ Ошибка: " + e.message); }
  }

  async function deletePeriod(id, month) {
    if (!confirm("Удалить период " + month + " и все его данные?")) return;
    setMsg("");
    try {
      var res = await fetch("/api/data-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-period", period_id: id }),
      });
      var json = await res.json();
      if (json.ok) {
        setMsg("✅ Период " + month + " удалён");
        loadData();
      } else {
        setMsg("❌ " + (json.error || "Ошибка"));
      }
    } catch (e) { setMsg("❌ Ошибка: " + e.message); }
  }

  async function cleanupProjects() {
    if (!confirm("Удалить все проекты без финансовых данных?")) return;
    setMsg("");
    try {
      var res = await fetch("/api/data-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup-projects" }),
      });
      var json = await res.json();
      if (json.ok) {
        setMsg("✅ Удалено пустых проектов: " + json.deleted_count + (json.deleted_names && json.deleted_names.length > 0 ? " (" + json.deleted_names.join(", ") + ")" : ""));
        loadData();
      } else {
        setMsg("❌ " + (json.error || "Ошибка"));
      }
    } catch (e) { setMsg("❌ Ошибка: " + e.message); }
  }

  async function cleanupPeriods() {
    if (!confirm("Удалить все пустые периоды (без данных)?")) return;
    setMsg("");
    try {
      var res = await fetch("/api/data-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup-periods" }),
      });
      var json = await res.json();
      if (json.ok) {
        setMsg("✅ Удалено пустых периодов: " + json.deleted_count);
        loadData();
      } else {
        setMsg("❌ " + (json.error || "Ошибка"));
      }
    } catch (e) { setMsg("❌ Ошибка: " + e.message); }
  }

  function fmtNum(x) { return Number(x || 0).toLocaleString("ru-RU"); }

  var emptyProjects = projects.filter(function (p) { return Number(p.row_count) === 0; });
  var emptyPeriods = periods.filter(function (p) { return Number(p.row_count) === 0; });

  if (!auth.isAdmin) {
    return (
      <DkrsAppShell>
        <div className="dm-page">
          <div className="dm-empty glass-card">
            <div className="dm-empty-icon">🔒</div>
            <p>Доступ только для администратора</p>
          </div>
        </div>
      </DkrsAppShell>
    );
  }

  return (
    <DkrsAppShell>
      <div className={"dm-page" + (mounted ? " mounted" : "")}>

        <div className="dm-header">
          <div>
            <h1 className="dm-title">🗃️ Управление данными</h1>
            <p className="dm-subtitle">Удаление проектов, периодов и очистка пустых записей</p>
          </div>
        </div>

        {msg && (
          <div className={"dm-msg glass-card " + (msg.startsWith("✅") ? "success" : "error")}
            style={{ padding: "16px 20px", marginBottom: 20, borderRadius: 12, fontSize: 14 }}>
            {msg}
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <button className="dkrs-btn primary" onClick={cleanupProjects}
            style={{ background: "linear-gradient(135deg, #f97316, #fb923c)", border: "none", color: "#fff", padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            🧹 Удалить пустые проекты ({emptyProjects.length})
          </button>
          <button className="dkrs-btn primary" onClick={cleanupPeriods}
            style={{ background: "linear-gradient(135deg, #8b5cf6, #a78bfa)", border: "none", color: "#fff", padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            🧹 Удалить пустые периоды ({emptyPeriods.length})
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={function () { setTab("projects"); }}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              background: tab === "projects" ? "linear-gradient(135deg, #00bfa6, #00e5cc)" : "#e2e8f0",
              color: tab === "projects" ? "#fff" : "#475569" }}>
            📁 Проекты ({projects.length})
          </button>
          <button onClick={function () { setTab("periods"); }}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              background: tab === "periods" ? "linear-gradient(135deg, #00bfa6, #00e5cc)" : "#e2e8f0",
              color: tab === "periods" ? "#fff" : "#475569" }}>
            📅 Периоды ({periods.length})
          </button>
        </div>

        {loading ? (
          <div className="dm-loading glass-card"><span className="loader-spinner" /> Загрузка...</div>
        ) : tab === "projects" ? (
          <div className="glass-card" style={{ padding: 0, overflow: "hidden", borderRadius: 16 }}>
            <table className="dm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Проект</th>
                  <th style={thStyleR}>Записей</th>
                  <th style={thStyleR}>Выручка</th>
                  <th style={thStyleR}>Статус</th>
                  <th style={thStyleR}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(function (p) {
                  var isEmpty = Number(p.row_count) === 0;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: isEmpty ? "rgba(239,68,68,0.03)" : "transparent" }}>
                      <td style={tdStyle}>{p.id}</td>
                      <td style={tdStyle}><strong>{p.name}</strong></td>
                      <td style={tdStyleR}>{p.row_count}</td>
                      <td style={tdStyleR}>{fmtNum(p.total_revenue)} ₽</td>
                      <td style={tdStyleR}>
                        {isEmpty
                          ? <span style={{ color: "#ef4444", fontWeight: 600, fontSize: 12 }}>⚠️ Пустой</span>
                          : <span style={{ color: "#10b981", fontWeight: 600, fontSize: 12 }}>✅ Активный</span>}
                      </td>
                      <td style={tdStyleR}>
                        <button onClick={function () { deleteProject(p.id, p.name); }}
                          style={delBtnStyle}>🗑️ Удалить</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: "hidden", borderRadius: 16 }}>
            <table className="dm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Период</th>
                  <th style={thStyleR}>Записей</th>
                  <th style={thStyleR}>Проектов</th>
                  <th style={thStyleR}>Выручка</th>
                  <th style={thStyleR}>Статус</th>
                  <th style={thStyleR}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {periods.map(function (p) {
                  var isEmpty = Number(p.row_count) === 0;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: isEmpty ? "rgba(239,68,68,0.03)" : "transparent" }}>
                      <td style={tdStyle}>{p.id}</td>
                      <td style={tdStyle}><strong>{p.month}</strong></td>
                      <td style={tdStyleR}>{p.row_count}</td>
                      <td style={tdStyleR}>{p.project_count}</td>
                      <td style={tdStyleR}>{fmtNum(p.total_revenue)} ₽</td>
                      <td style={tdStyleR}>
                        {isEmpty
                          ? <span style={{ color: "#ef4444", fontWeight: 600, fontSize: 12 }}>⚠️ Пустой</span>
                          : <span style={{ color: "#10b981", fontWeight: 600, fontSize: 12 }}>✅ Данные есть</span>}
                      </td>
                      <td style={tdStyleR}>
                        <button onClick={function () { deletePeriod(p.id, p.month); }}
                          style={delBtnStyle}>🗑️ Удалить</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </DkrsAppShell>
  );
}

var thStyle = { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" };
var thStyleR = Object.assign({}, thStyle, { textAlign: "right" });
var tdStyle = { padding: "12px 16px", fontSize: 14 };
var tdStyleR = Object.assign({}, tdStyle, { textAlign: "right" });
var delBtnStyle = { background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12 };
