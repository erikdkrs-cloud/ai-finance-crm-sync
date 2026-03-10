import React, { useState, useEffect } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiFloatingButton from "../components/AiFloatingButton";

export default function DataManagementPage() {
  var _m = useState(false), mounted = _m[0], setMounted = _m[1];
  var _data = useState([]), data = _data[0], setData = _data[1];
  var _periods = useState([]), periods = _periods[0], setPeriods = _periods[1];
  var _projects = useState([]), projects = _projects[0], setProjects = _projects[1];
  var _selPeriod = useState(""), selPeriod = _selPeriod[0], setSelPeriod = _selPeriod[1];
  var _selProject = useState(""), selProject = _selProject[0], setSelProject = _selProject[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _saving = useState(false), saving = _saving[0], setSaving = _saving[1];
  var _msg = useState(""), msg = _msg[0], setMsg = _msg[1];
  var _editRow = useState(null), editRow = _editRow[0], setEditRow = _editRow[1];
  var _editValues = useState({}), editValues = _editValues[0], setEditValues = _editValues[1];
  var _deleteConfirm = useState(null), deleteConfirm = _deleteConfirm[0], setDeleteConfirm = _deleteConfirm[1];
  var _addMode = useState(false), addMode = _addMode[0], setAddMode = _addMode[1];
  var _newRow = useState({
    project: "", month: "", revenue_no_vat: 0,
    salary_workers: 0, salary_manager: 0, salary_head: 0,
    ads: 0, transport: 0, penalties: 0, tax: 0
  }), newRow = _newRow[0], setNewRow = _newRow[1];

  useEffect(function () { setMounted(true); loadData(); }, []);

  useEffect(function () { loadData(); }, [selPeriod, selProject]);

  async function loadData() {
    setLoading(true);
    try {
      var params = new URLSearchParams();
      if (selPeriod) params.set("month", selPeriod);
      if (selProject) params.set("project", selProject);
      var res = await fetch("/api/data-management?" + params.toString());
      var json = await res.json();
      if (json.ok) {
        setData(json.rows || []);
        if (json.periods) setPeriods(json.periods);
        if (json.projects) setProjects(json.projects);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function startEdit(row) {
    setEditRow(row.id);
    setEditValues({
      revenue_no_vat: row.revenue_no_vat,
      salary_workers: row.salary_workers,
      salary_manager: row.salary_manager,
      salary_head: row.salary_head,
      ads: row.ads,
      transport: row.transport,
      penalties: row.penalties,
      tax: row.tax,
    });
    setMsg("");
  }

  function cancelEdit() {
    setEditRow(null);
    setEditValues({});
  }

  function handleEditChange(field, value) {
    setEditValues(function (prev) {
      var next = Object.assign({}, prev);
      next[field] = value;
      return next;
    });
  }

  async function saveEdit(rowId) {
    setSaving(true);
    setMsg("");
    try {
      var res = await fetch("/api/data-management", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId, values: editValues }),
      });
      var json = await res.json();
      if (!json.ok) throw new Error(json.error || "Ошибка сохранения");
      setMsg("✅ Сохранено!");
      setEditRow(null);
      loadData();
    } catch (e) {
      setMsg("❌ " + e.message);
    }
    setSaving(false);
  }

  async function deleteRow(rowId) {
    setSaving(true);
    setMsg("");
    try {
      var res = await fetch("/api/data-management", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId }),
      });
      var json = await res.json();
      if (!json.ok) throw new Error(json.error || "Ошибка удаления");
      setMsg("🗑️ Удалено!");
      setDeleteConfirm(null);
      loadData();
    } catch (e) {
      setMsg("❌ " + e.message);
    }
    setSaving(false);
  }

  function handleNewRowChange(field, value) {
    setNewRow(function (prev) {
      var next = Object.assign({}, prev);
      next[field] = value;
      return next;
    });
  }

  async function saveNewRow() {
    setSaving(true);
    setMsg("");
    try {
      if (!newRow.project || !newRow.month) throw new Error("Укажите проект и период");
      var res = await fetch("/api/data-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow),
      });
      var json = await res.json();
      if (!json.ok) throw new Error(json.error || "Ошибка добавления");
      setMsg("✅ Добавлено!");
      setAddMode(false);
      setNewRow({
        project: "", month: "", revenue_no_vat: 0,
        salary_workers: 0, salary_manager: 0, salary_head: 0,
        ads: 0, transport: 0, penalties: 0, tax: 0
      });
      loadData();
    } catch (e) {
      setMsg("❌ " + e.message);
    }
    setSaving(false);
  }

  function fmtNum(x) {
    return Number(x || 0).toLocaleString("ru-RU");
  }

  var FIELDS = [
    { key: "revenue_no_vat", label: "Выручка", icon: "💰" },
    { key: "salary_workers", label: "ЗП Рабочие", icon: "👷" },
    { key: "salary_manager", label: "ЗП Менеджмент", icon: "👔" },
    { key: "salary_head", label: "ЗП Руковод.", icon: "👤" },
    { key: "ads", label: "Реклама", icon: "📢" },
    { key: "transport", label: "Транспорт", icon: "🚛" },
    { key: "penalties", label: "Штрафы", icon: "⚠️" },
    { key: "tax", label: "Налоги", icon: "🏛️" },
  ];

  return (
    <DkrsAppShell>
      <div className={"dm-page" + (mounted ? " mounted" : "")}>

        <div className="dm-header">
          <div>
            <h1 className="dm-title">🗃️ Управление данными</h1>
            <p className="dm-subtitle">Просмотр, редактирование и удаление финансовых записей</p>
          </div>
          <button className="import-btn primary" onClick={function () { setAddMode(!addMode); setMsg(""); }}>
            {addMode ? "✕ Отмена" : "+ Добавить запись"}
          </button>
        </div>

        {msg && <div className={"dm-msg" + (msg.startsWith("❌") ? " error" : "")}>{msg}</div>}

        {/* Filters */}
        <div className="dm-filters glass-card">
          <div className="dm-filter">
            <label>📅 Период</label>
            <select value={selPeriod} onChange={function (e) { setSelPeriod(e.target.value); }}>
              <option value="">Все периоды</option>
              {periods.map(function (p) { return <option key={p} value={p}>{p}</option>; })}
            </select>
          </div>
          <div className="dm-filter">
            <label>🏗️ Проект</label>
            <select value={selProject} onChange={function (e) { setSelProject(e.target.value); }}>
              <option value="">Все проекты</option>
              {projects.map(function (p) { return <option key={p} value={p}>{p}</option>; })}
            </select>
          </div>
          <div className="dm-filter-info">
            📊 Найдено: <strong>{data.length}</strong> записей
          </div>
        </div>

        {/* Add new row */}
        {addMode && (
          <div className="dm-add-card glass-card">
            <h3>➕ Новая запись</h3>
            <div className="dm-add-grid">
              <div className="dm-add-field">
                <label>🏗️ Проект</label>
                <input type="text" placeholder="Название проекта" value={newRow.project}
                  onChange={function (e) { handleNewRowChange("project", e.target.value); }} />
              </div>
              <div className="dm-add-field">
                <label>📅 Период</label>
                <input type="text" placeholder="2025-01" value={newRow.month}
                  onChange={function (e) { handleNewRowChange("month", e.target.value); }} />
              </div>
              {FIELDS.map(function (f) {
                return (
                  <div key={f.key} className="dm-add-field">
                    <label>{f.icon} {f.label}</label>
                    <input type="number" value={newRow[f.key]}
                      onChange={function (e) { handleNewRowChange(f.key, e.target.value); }} />
                  </div>
                );
              })}
            </div>
            <div className="dm-add-actions">
              <button className="import-btn primary" onClick={saveNewRow} disabled={saving}>
                {saving ? "Сохраняем..." : "💾 Сохранить"}
              </button>
            </div>
          </div>
        )}

        {/* Data table */}
        {loading ? (
          <div className="dm-loading glass-card">
            <span className="loader-spinner" /> Загрузка данных...
          </div>
        ) : data.length === 0 ? (
          <div className="dm-empty glass-card">
            <div className="dm-empty-icon">📭</div>
            <p>Нет данных. Загрузите файл на странице <a href="/import">Импорт</a>.</p>
          </div>
        ) : (
          <div className="dm-table-wrapper glass-card">
            <table className="dm-table">
              <thead>
                <tr>
                  <th>🏗️ Проект</th>
                  <th>📅 Период</th>
                  {FIELDS.map(function (f) {
                    return <th key={f.key}>{f.icon} {f.label}</th>;
                  })}
                  <th>📊 Прибыль</th>
                  <th>⚙️</th>
                </tr>
              </thead>
              <tbody>
                {data.map(function (row) {
                  var isEditing = editRow === row.id;
                  var costs = Number(row.salary_workers || 0) + Number(row.salary_manager || 0) +
                    Number(row.salary_head || 0) + Number(row.ads || 0) +
                    Number(row.transport || 0) + Number(row.penalties || 0) + Number(row.tax || 0);
                  var profit = Number(row.revenue_no_vat || 0) - costs;

                  return (
                    <tr key={row.id} className={isEditing ? "editing" : ""}>
                      <td className="dm-cell-project">{row.project_name}</td>
                      <td className="dm-cell-month">{row.month}</td>
                      {FIELDS.map(function (f) {
                        return (
                          <td key={f.key}>
                            {isEditing ? (
                              <input type="number" className="dm-edit-input"
                                value={editValues[f.key] || 0}
                                onChange={function (e) { handleEditChange(f.key, e.target.value); }} />
                            ) : (
                              <span className="dm-cell-num">{fmtNum(row[f.key])}</span>
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <span className={"dm-cell-profit" + (profit >= 0 ? " positive" : " negative")}>
                          {fmtNum(profit)}
                        </span>
                      </td>
                      <td className="dm-cell-actions">
                        {isEditing ? (
                          <React.Fragment>
                            <button className="dm-action-btn save" onClick={function () { saveEdit(row.id); }} disabled={saving}>💾</button>
                            <button className="dm-action-btn cancel" onClick={cancelEdit}>✕</button>
                          </React.Fragment>
                        ) : deleteConfirm === row.id ? (
                          <React.Fragment>
                            <button className="dm-action-btn delete-confirm" onClick={function () { deleteRow(row.id); }} disabled={saving}>Да, удалить</button>
                            <button className="dm-action-btn cancel" onClick={function () { setDeleteConfirm(null); }}>Нет</button>
                          </React.Fragment>
                        ) : (
                          <React.Fragment>
                            <button className="dm-action-btn edit" onClick={function () { startEdit(row); }} title="Редактировать">✏️</button>
                            <button className="dm-action-btn delete" onClick={function () { setDeleteConfirm(row.id); }} title="Удалить">🗑️</button>
                          </React.Fragment>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AiFloatingButton />
    </DkrsAppShell>
  );
}
