import React, { useState, useEffect, useRef } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiFloatingButton from "../components/AiFloatingButton";

var REQUIRED_COLUMNS = [
  { key: "project", label: "Проект", icon: "🏗️", desc: "Название проекта" },
  { key: "month", label: "Период", icon: "📅", desc: "Формат: 2025-01" },
  { key: "revenue", label: "Выручка", icon: "💰", desc: "Число" },
  { key: "expense_salary_workers", label: "ЗП Рабочие", icon: "👷", desc: "Зарплаты рабочих" },
  { key: "expense_salary_management", label: "ЗП Менеджмент", icon: "👔", desc: "Зарплаты управления" },
  { key: "expense_ads", label: "Реклама", icon: "📢", desc: "Расходы на рекламу" },
  { key: "expense_transport", label: "Транспорт", icon: "🚛", desc: "Логистика" },
  { key: "expense_other", label: "Прочее", icon: "📦", desc: "Другие расходы" },
];

var OPTIONAL_COLUMNS = [
  { key: "expense_fines", label: "Штрафы", icon: "⚠️" },
  { key: "expense_tax", label: "Налоги", icon: "🏛️" },
  { key: "expense_rent", label: "Аренда", icon: "🏢" },
];

export default function ImportPage() {
  var _m = useState(false), mounted = _m[0], setMounted = _m[1];
  var _step = useState(1), step = _step[0], setStep = _step[1];
  var _file = useState(null), file = _file[0], setFile = _file[1];
  var _data = useState(null), rawData = _data[0], setRawData = _data[1];
  var _headers = useState([]), headers = _headers[0], setHeaders = _headers[1];
  var _rows = useState([]), rows = _rows[0], setRows = _rows[1];
  var _mapping = useState({}), mapping = _mapping[0], setMapping = _mapping[1];
  var _loading = useState(false), loading = _loading[0], setLoading = _loading[1];
  var _importing = useState(false), importing = _importing[0], setImporting = _importing[1];
  var _result = useState(null), result = _result[0], setResult = _result[1];
  var _error = useState(""), error = _error[0], setError = _error[1];
  var _dragOver = useState(false), dragOver = _dragOver[0], setDragOver = _dragOver[1];
  var _review = useState(null), review = _review[0], setReview = _review[1];
  var _renames = useState({}), renames = _renames[0], setRenames = _renames[1];
  var _existingProjects = useState([]), existingProjects = _existingProjects[0], setExistingProjects = _existingProjects[1];
  var fileInputRef = useRef(null);

  useEffect(function () { setMounted(true); }, []);

  function handleDragOver(e) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave(e) { e.preventDefault(); setDragOver(false); }
  function handleDrop(e) { e.preventDefault(); setDragOver(false); var f = e.dataTransfer.files[0]; if (f) processFile(f); }
  function handleFileSelect(e) { var f = e.target.files[0]; if (f) processFile(f); }

  async function processFile(f) {
    setError(""); setFile(f); setLoading(true);
    try {
      var ext = f.name.split(".").pop().toLowerCase();
      if (["xlsx", "xls", "csv"].indexOf(ext) === -1) throw new Error("Поддерживаются только .xlsx, .xls, .csv файлы");
      if (f.size > 10 * 1024 * 1024) throw new Error("Файл слишком большой (макс. 10 МБ)");

      var arrayBuffer = await new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (e) { resolve(e.target.result); };
        reader.onerror = function () { reject(new Error("Ошибка чтения файла")); };
        reader.readAsArrayBuffer(f);
      });

      var XLSX = (await import("xlsx")).default || (await import("xlsx"));
      var workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      var sheet = workbook.Sheets[workbook.SheetNames[0]];
      var jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (jsonData.length < 2) throw new Error("Файл пустой или содержит только заголовки");

      var fileHeaders = jsonData[0].map(function (h) { return String(h).trim(); });
      var fileRows = jsonData.slice(1).filter(function (row) {
        return row.some(function (cell) { return cell !== "" && cell !== null && cell !== undefined; });
      });

      setHeaders(fileHeaders); setRows(fileRows); setRawData(jsonData);

      var autoMapping = {};
      REQUIRED_COLUMNS.concat(OPTIONAL_COLUMNS).forEach(function (col) {
        var found = fileHeaders.findIndex(function (h) {
          var hl = h.toLowerCase();
          if (col.key === "project") return hl.includes("проект") || hl.includes("project") || hl.includes("название");
          if (col.key === "month") return hl.includes("период") || hl.includes("месяц") || hl.includes("month") || hl.includes("дата");
          if (col.key === "revenue") return hl.includes("выручк") || hl.includes("revenue") || hl.includes("доход");
          if (col.key === "expense_salary_workers") return hl.includes("зп рабоч") || hl.includes("зарплат рабоч") || hl.includes("salary work");
          if (col.key === "expense_salary_management") return hl.includes("зп менедж") || hl.includes("зп управ") || hl.includes("зарплат менедж") || hl.includes("salary manag");
          if (col.key === "expense_ads") return hl.includes("реклам") || hl.includes("ads") || hl.includes("маркет");
          if (col.key === "expense_transport") return hl.includes("транспорт") || hl.includes("логист") || hl.includes("transport");
          if (col.key === "expense_other") return hl.includes("проч") || hl.includes("other") || hl.includes("друг");
          if (col.key === "expense_fines") return hl.includes("штраф") || hl.includes("fine");
          if (col.key === "expense_tax") return hl.includes("налог") || hl.includes("tax");
          if (col.key === "expense_rent") return hl.includes("аренд") || hl.includes("rent");
          return false;
        });
        if (found >= 0) autoMapping[col.key] = found;
      });
      setMapping(autoMapping);
      setStep(2);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  function updateMapping(colKey, headerIndex) {
    setMapping(function (prev) {
      var next = Object.assign({}, prev);
      if (headerIndex === "") { delete next[colKey]; } else { next[colKey] = parseInt(headerIndex); }
      return next;
    });
  }

  function canImport() {
    return REQUIRED_COLUMNS.every(function (col) { return mapping[col.key] !== undefined && mapping[col.key] !== ""; });
  }

  function getMappedPreview() {
    return rows.slice(0, 5).map(function (row) {
      var obj = {};
      Object.keys(mapping).forEach(function (key) { obj[key] = row[mapping[key]] || ""; });
      return obj;
    });
  }

  function buildImportRows() {
    return rows.map(function (row) {
      var obj = {};
      Object.keys(mapping).forEach(function (key) {
        var val = row[mapping[key]];
        if (key === "project" || key === "month") { obj[key] = String(val || "").trim(); }
        else { obj[key] = parseFloat(String(val).replace(/[^\d.-]/g, "")) || 0; }
      });
      return obj;
    }).filter(function (r) { return r.project && r.month && r.revenue > 0; });
  }

  async function checkProjects() {
    setImporting(true); setError(""); setReview(null);
    try {
      var validRows = buildImportRows();
      if (validRows.length === 0) throw new Error("Нет валидных строк для импорта");

      var checkRes = await fetch("/api/import-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      var checkData = await checkRes.json();

      if (checkData.ok && checkData.needsReview) {
        setReview(checkData.projectReview);
        setExistingProjects(checkData.existingProjects || []);
        setRenames({});
        setStep(3.5);
      } else if (!checkData.ok) {
        throw new Error(checkData.error || "Ошибка");
      }
    } catch (e) { setError(e.message); }
    setImporting(false);
  }

  async function confirmImport() {
    setImporting(true); setError("");
    try {
      var validRows = buildImportRows();
      var importRes = await fetch("/api/import-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows, renames: renames, confirmed: true }),
      });
      var importData = await importRes.json();
      if (!importData.ok) throw new Error(importData.error || "Ошибка импорта");

      setResult({
        total: validRows.length,
        imported: importData.imported || validRows.length,
        skipped: rows.length - validRows.length,
        projects: importData.projects || [],
        periods: importData.periods || [],
      });
      setStep(4);
    } catch (e) { setError(e.message); }
    setImporting(false);
  }

  function updateRename(fileProject, value) {
    setRenames(function (prev) {
      var next = Object.assign({}, prev);
      if (value === "__new__" || value === "") { delete next[fileProject]; }
      else { next[fileProject] = value; }
      return next;
    });
  }

  function resetAll() {
    setStep(1); setFile(null); setRawData(null); setHeaders([]);
    setRows([]); setMapping({}); setResult(null); setError("");
    setReview(null); setRenames({}); setExistingProjects([]);
  }

  return (
    <DkrsAppShell>
      <div className={"import-page" + (mounted ? " mounted" : "")}>

        <div className="import-header">
          <div>
            <h1 className="import-title">📎 Импорт данных</h1>
            <p className="import-subtitle">Загрузите Excel или CSV файл с финансовыми данными</p>
          </div>
          <div className="import-steps">
            {[{ n: 1, label: "Загрузка" }, { n: 2, label: "Маппинг" }, { n: 3, label: "Проверка" }, { n: 4, label: "Готово" }].map(function (s, i) {
              var active = step >= s.n || (s.n === 3 && step >= 3);
              var done = step > s.n || (s.n === 3 && step > 3.5);
              return (
                <React.Fragment key={s.n}>
                  {i > 0 && <div className="step-line" />}
                  <div className={"import-step" + (active ? " active" : "") + (done ? " done" : "")}>
                    <span className="step-num">{done ? "✓" : s.n}</span>
                    <span className="step-label">{s.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="import-card glass-card">
            <div className={"import-dropzone" + (dragOver ? " drag-over" : "")} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={function () { fileInputRef.current.click(); }}>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} style={{ display: "none" }} />
              {loading ? (<div className="dropzone-loading"><span className="loader-spinner" /><span>Обрабатываем файл...</span></div>) : (
                <React.Fragment><div className="dropzone-icon">📄</div><div className="dropzone-title">Перетащите файл сюда</div><div className="dropzone-desc">или нажмите для выбора • .xlsx, .xls, .csv • до 10 МБ</div></React.Fragment>
              )}
            </div>
            {error && <div className="import-error">⚠️ {error}</div>}
            <div className="import-template-section">
              <h3>📋 Ожидаемые колонки</h3>
              <div className="template-columns">
                {REQUIRED_COLUMNS.map(function (col) { return (<div key={col.key} className="template-col required"><span className="template-col-icon">{col.icon}</span><span className="template-col-name">{col.label}</span><span className="template-col-badge">обязательно</span></div>); })}
                {OPTIONAL_COLUMNS.map(function (col) { return (<div key={col.key} className="template-col optional"><span className="template-col-icon">{col.icon}</span><span className="template-col-name">{col.label}</span><span className="template-col-badge optional">опционально</span></div>); })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="import-card glass-card">
            <div className="import-card-header"><div><h2>🔗 Маппинг колонок</h2><p className="import-card-desc">Файл: <strong>{file.name}</strong> • {rows.length} строк • {headers.length} колонок</p></div></div>
            <div className="mapping-grid">
              <div className="mapping-section">
                <h3 className="mapping-section-title">Обязательные поля</h3>
                {REQUIRED_COLUMNS.map(function (col) {
                  return (<div key={col.key} className={"mapping-row" + (mapping[col.key] !== undefined ? " mapped" : " unmapped")}><div className="mapping-left"><span className="mapping-icon">{col.icon}</span><div><div className="mapping-label">{col.label}</div><div className="mapping-desc">{col.desc}</div></div></div><div className="mapping-arrow">{mapping[col.key] !== undefined ? "✅" : "→"}</div><select className="mapping-select" value={mapping[col.key] !== undefined ? mapping[col.key] : ""} onChange={function (e) { updateMapping(col.key, e.target.value); }}><option value="">— Выберите колонку —</option>{headers.map(function (h, i) { return <option key={i} value={i}>{h}</option>; })}</select></div>);
                })}
              </div>
              <div className="mapping-section">
                <h3 className="mapping-section-title">Дополнительные поля</h3>
                {OPTIONAL_COLUMNS.map(function (col) {
                  return (<div key={col.key} className={"mapping-row" + (mapping[col.key] !== undefined ? " mapped" : "")}><div className="mapping-left"><span className="mapping-icon">{col.icon}</span><div className="mapping-label">{col.label}</div></div><div className="mapping-arrow">{mapping[col.key] !== undefined ? "✅" : "→"}</div><select className="mapping-select" value={mapping[col.key] !== undefined ? mapping[col.key] : ""} onChange={function (e) { updateMapping(col.key, e.target.value); }}><option value="">— Пропустить —</option>{headers.map(function (h, i) { return <option key={i} value={i}>{h}</option>; })}</select></div>);
                })}
              </div>
            </div>
            <div className="import-actions">
              <button className="import-btn secondary" onClick={resetAll}>← Назад</button>
              <button className="import-btn primary" onClick={function () { setStep(3); }} disabled={!canImport()}>Далее: Предпросмотр →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="import-card glass-card">
            <div className="import-card-header"><div><h2>👁️ Предпросмотр</h2><p className="import-card-desc">Первые 5 строк</p></div></div>
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead><tr>{REQUIRED_COLUMNS.concat(OPTIONAL_COLUMNS).filter(function (col) { return mapping[col.key] !== undefined; }).map(function (col) { return <th key={col.key}>{col.icon} {col.label}</th>; })}</tr></thead>
                <tbody>{getMappedPreview().map(function (row, i) { return (<tr key={i}>{REQUIRED_COLUMNS.concat(OPTIONAL_COLUMNS).filter(function (col) { return mapping[col.key] !== undefined; }).map(function (col) { return <td key={col.key}>{row[col.key]}</td>; })}</tr>); })}</tbody>
              </table>
            </div>
            <div className="preview-stats">
              <div className="preview-stat"><span className="preview-stat-icon">📊</span><span className="preview-stat-label">Строк</span><span className="preview-stat-value">{rows.length}</span></div>
              <div className="preview-stat"><span className="preview-stat-icon">✅</span><span className="preview-stat-label">Полей</span><span className="preview-stat-value">{Object.keys(mapping).length}</span></div>
            </div>
            {error && <div className="import-error">⚠️ {error}</div>}
            <div className="import-actions">
              <button className="import-btn secondary" onClick={function () { setStep(2); }}>← Маппинг</button>
              <button className="import-btn primary" onClick={checkProjects} disabled={importing}>
                {importing ? <span><span className="loader-spinner small" /> Проверяем проекты...</span> : "🔍 Проверить и импортировать"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3.5: Review ALL projects */}
        {step === 3.5 && review && (
          <div className="import-card glass-card">
            <div className="import-card-header">
              <div>
                <h2>🔍 Проверка проектов</h2>
                <p className="import-card-desc">Проверьте названия проектов из файла. Если видите опечатку — привяжите к существующему проекту.</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              {review.map(function (item) {
                var isExact = item.exactMatch;
                var isRenamed = renames[item.fileProject] !== undefined;
                var hasSimilar = item.similar && item.similar.length > 0;

                return (
                  <div key={item.fileProject} style={{
                    border: "1px solid " + (isExact ? "rgba(16,185,129,0.3)" : isRenamed ? "rgba(0,191,166,0.3)" : "rgba(249,115,22,0.3)"),
                    background: isExact ? "rgba(16,185,129,0.03)" : isRenamed ? "rgba(0,191,166,0.03)" : "rgba(249,115,22,0.03)",
                    borderRadius: 12, padding: 16,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isExact && !hasSimilar ? 0 : 10 }}>
                      <span style={{ fontSize: 18 }}>{isExact ? "✅" : isRenamed ? "🔄" : "⚠️"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>«{item.fileProject}»</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                          {isExact ? "Найден в базе — совпадение 100%"
                            : isRenamed ? "Будет привязан к → «" + renames[item.fileProject] + "»"
                            : "Новый проект — не найден в базе"}
                        </div>
                      </div>
                      {isExact && <span style={{ fontSize: 11, background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>100% совпадение</span>}
                    </div>

                    {!isExact && (
                      <div>
                        {hasSimilar && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Похожие проекты в базе:</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {item.similar.map(function (s) {
                                var sel = renames[item.fileProject] === s.name;
                                return (
                                  <button key={s.name} onClick={function () { updateRename(item.fileProject, sel ? "__new__" : s.name); }}
                                    style={{
                                      display: "flex", justifyContent: "space-between", alignItems: "center",
                                      padding: "8px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
                                      border: sel ? "2px solid #00bfa6" : "1px solid rgba(0,0,0,0.08)",
                                      background: sel ? "rgba(0,191,166,0.08)" : "#fff",
                                      fontWeight: sel ? 600 : 400, fontSize: 13,
                                    }}>
                                    <span>{sel ? "✅ " : ""}{s.name}</span>
                                    <span style={{
                                      fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                                      background: s.similarity >= 80 ? "rgba(239,68,68,0.1)" : s.similarity >= 60 ? "rgba(249,115,22,0.1)" : "rgba(0,0,0,0.04)",
                                      color: s.similarity >= 80 ? "#ef4444" : s.similarity >= 60 ? "#f97316" : "#94a3b8",
                                    }}>
                                      {s.similarity}%
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <button onClick={function () { updateRename(item.fileProject, "__new__"); }}
                          style={{
                            padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                            border: !isRenamed ? "2px solid #6366f1" : "1px solid rgba(0,0,0,0.08)",
                            background: !isRenamed ? "rgba(99,102,241,0.08)" : "#f8fafc",
                            color: !isRenamed ? "#6366f1" : "#94a3b8",
                          }}>
                          ➕ Создать как новый проект
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div style={{ marginTop: 20, padding: 14, background: "rgba(0,0,0,0.02)", borderRadius: 10, fontSize: 13, display: "flex", gap: 20, flexWrap: "wrap" }}>
              <span>✅ Совпадений: <strong>{review.filter(function (r) { return r.exactMatch; }).length}</strong></span>
              <span>🔄 Переименований: <strong>{Object.keys(renames).length}</strong></span>
              <span>➕ Новых: <strong>{review.filter(function (r) { return !r.exactMatch && !renames[r.fileProject]; }).length}</strong></span>
            </div>

            {error && <div className="import-error" style={{ marginTop: 16 }}>⚠️ {error}</div>}

            <div className="import-actions" style={{ marginTop: 20 }}>
              <button className="import-btn secondary" onClick={function () { setStep(3); setReview(null); }}>← Назад</button>
              <button className="import-btn primary" onClick={confirmImport} disabled={importing}>
                {importing ? <span><span className="loader-spinner small" /> Импортируем...</span> : "✅ Подтвердить импорт"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && result && (
          <div className="import-card glass-card">
            <div className="import-success">
              <div className="success-icon">🎉</div>
              <h2 className="success-title">Импорт завершён!</h2>
              <p className="success-desc">Данные успешно загружены в систему</p>
              <div className="success-stats">
                <div className="success-stat"><span className="success-stat-num">{result.imported}</span><span className="success-stat-label">Импортировано</span></div>
                <div className="success-stat"><span className="success-stat-num">{result.skipped}</span><span className="success-stat-label">Пропущено</span></div>
                {result.projects && <div className="success-stat"><span className="success-stat-num">{result.projects.length}</span><span className="success-stat-label">Проектов</span></div>}
                {result.periods && <div className="success-stat"><span className="success-stat-num">{result.periods.length}</span><span className="success-stat-label">Периодов</span></div>}
              </div>
              {Object.keys(renames).length > 0 && (
                <div style={{ marginTop: 16, padding: 14, background: "rgba(0,191,166,0.05)", borderRadius: 12, fontSize: 13 }}>
                  <strong>🔄 Переименования при импорте:</strong>
                  {Object.keys(renames).map(function (k) { return <div key={k} style={{ marginTop: 4 }}>«{k}» → «{renames[k]}»</div>; })}
                </div>
              )}
              <div className="success-actions">
                <button className="import-btn primary" onClick={function () { window.location.href = "/dashboard"; }}>📊 Перейти в дашборд</button>
                <button className="import-btn secondary" onClick={resetAll}>📎 Загрузить ещё</button>
              </div>
            </div>
          </div>
        )}

      </div>
      <AiFloatingButton />
    </DkrsAppShell>
  );
}
