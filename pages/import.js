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
  var fileInputRef = useRef(null);

  useEffect(function () { setMounted(true); }, []);

  function handleDragOver(e) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave(e) { e.preventDefault(); setDragOver(false); }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    var f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  function handleFileSelect(e) {
    var f = e.target.files[0];
    if (f) processFile(f);
  }

  async function processFile(f) {
    setError("");
    setFile(f);
    setLoading(true);

    try {
      var ext = f.name.split(".").pop().toLowerCase();
      if (!["xlsx", "xls", "csv"].includes(ext)) {
        throw new Error("Поддерживаются только .xlsx, .xls, .csv файлы");
      }
      if (f.size > 10 * 1024 * 1024) {
        throw new Error("Файл слишком большой (макс. 10 МБ)");
      }

      var reader = new FileReader();
      var arrayBuffer = await new Promise(function (resolve, reject) {
        reader.onload = function (e) { resolve(e.target.result); };
        reader.onerror = function () { reject(new Error("Ошибка чтения файла")); };
        reader.readAsArrayBuffer(f);
      });

      var XLSX = (await import("xlsx")).default || (await import("xlsx"));
      var workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      var sheetName = workbook.SheetNames[0];
      var sheet = workbook.Sheets[sheetName];
      var jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      if (jsonData.length < 2) {
        throw new Error("Файл пустой или содержит только заголовки");
      }

      var fileHeaders = jsonData[0].map(function (h) { return String(h).trim(); });
      var fileRows = jsonData.slice(1).filter(function (row) {
        return row.some(function (cell) { return cell !== "" && cell !== null && cell !== undefined; });
      });

      setHeaders(fileHeaders);
      setRows(fileRows);
      setRawData(jsonData);

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
    } catch (e) {
      setError(e.message);
    }
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
    return REQUIRED_COLUMNS.every(function (col) {
      return mapping[col.key] !== undefined && mapping[col.key] !== "";
    });
  }

  function getMappedPreview() {
    return rows.slice(0, 5).map(function (row) {
      var obj = {};
      Object.keys(mapping).forEach(function (key) {
        obj[key] = row[mapping[key]] || "";
      });
      return obj;
    });
  }

  async function startImport() {
    setImporting(true);
    setError("");
    try {
      var importRows = rows.map(function (row) {
        var obj = {};
        Object.keys(mapping).forEach(function (key) {
          var val = row[mapping[key]];
          if (key === "project" || key === "month") {
            obj[key] = String(val || "").trim();
          } else {
            obj[key] = parseFloat(String(val).replace(/[^\d.-]/g, "")) || 0;
          }
        });
        return obj;
      });

      var validRows = importRows.filter(function (r) {
        return r.project && r.month && r.revenue > 0;
      });

      if (validRows.length === 0) {
        throw new Error("Нет валидных строк для импорта. Проверьте маппинг.");
      }

      var res = await fetch("/api/import-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      var data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка импорта");

      setResult({
        total: validRows.length,
        imported: data.imported || validRows.length,
        skipped: rows.length - validRows.length,
        projects: data.projects || [],
        periods: data.periods || [],
      });
      setStep(4);
    } catch (e) {
      setError(e.message);
    }
    setImporting(false);
  }

  function resetAll() {
    setStep(1); setFile(null); setRawData(null); setHeaders([]);
    setRows([]); setMapping({}); setResult(null); setError("");
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
            <div className={"import-step" + (step >= 1 ? " active" : "") + (step > 1 ? " done" : "")}>
              <span className="step-num">{step > 1 ? "✓" : "1"}</span>
              <span className="step-label">Загрузка</span>
            </div>
            <div className="step-line" />
            <div className={"import-step" + (step >= 2 ? " active" : "") + (step > 2 ? " done" : "")}>
              <span className="step-num">{step > 2 ? "✓" : "2"}</span>
              <span className="step-label">Маппинг</span>
            </div>
            <div className="step-line" />
            <div className={"import-step" + (step >= 3 ? " active" : "") + (step > 3 ? " done" : "")}>
              <span className="step-num">{step > 3 ? "✓" : "3"}</span>
              <span className="step-label">Проверка</span>
            </div>
            <div className="step-line" />
            <div className={"import-step" + (step >= 4 ? " active" : "")}>
              <span className="step-num">4</span>
              <span className="step-label">Готово</span>
            </div>
          </div>
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="import-card glass-card">
            <div
              className={"import-dropzone" + (dragOver ? " drag-over" : "")}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={function () { fileInputRef.current.click(); }}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} style={{ display: "none" }} />
              {loading ? (
                <div className="dropzone-loading">
                  <span className="loader-spinner" />
                  <span>Обрабатываем файл...</span>
                </div>
              ) : (
                <React.Fragment>
                  <div className="dropzone-icon">📄</div>
                  <div className="dropzone-title">Перетащите файл сюда</div>
                  <div className="dropzone-desc">или нажмите для выбора • .xlsx, .xls, .csv • до 10 МБ</div>
                </React.Fragment>
              )}
            </div>
            {error && <div className="import-error">⚠️ {error}</div>}

            <div className="import-template-section">
              <h3>📋 Ожидаемые колонки</h3>
              <div className="template-columns">
                {REQUIRED_COLUMNS.map(function (col) {
                  return (
                    <div key={col.key} className="template-col required">
                      <span className="template-col-icon">{col.icon}</span>
                      <span className="template-col-name">{col.label}</span>
                      <span className="template-col-badge">обязательно</span>
                    </div>
                  );
                })}
                {OPTIONAL_COLUMNS.map(function (col) {
                  return (
                    <div key={col.key} className="template-col optional">
                      <span className="template-col-icon">{col.icon}</span>
                      <span className="template-col-name">{col.label}</span>
                      <span className="template-col-badge optional">опционально</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Mapping */}
        {step === 2 && (
          <div className="import-card glass-card">
            <div className="import-card-header">
              <div>
                <h2>🔗 Маппинг колонок</h2>
                <p className="import-card-desc">
                  Файл: <strong>{file.name}</strong> • {rows.length} строк • {headers.length} колонок
                </p>
              </div>
            </div>

            <div className="mapping-grid">
              <div className="mapping-section">
                <h3 className="mapping-section-title">Обязательные поля</h3>
                {REQUIRED_COLUMNS.map(function (col) {
                  return (
                    <div key={col.key} className={"mapping-row" + (mapping[col.key] !== undefined ? " mapped" : " unmapped")}>
                      <div className="mapping-left">
                        <span className="mapping-icon">{col.icon}</span>
                        <div>
                          <div className="mapping-label">{col.label}</div>
                          <div className="mapping-desc">{col.desc}</div>
                        </div>
                      </div>
                      <div className="mapping-arrow">{mapping[col.key] !== undefined ? "✅" : "→"}</div>
                      <select
                        className="mapping-select"
                        value={mapping[col.key] !== undefined ? mapping[col.key] : ""}
                        onChange={function (e) { updateMapping(col.key, e.target.value); }}
                      >
                        <option value="">— Выберите колонку —</option>
                        {headers.map(function (h, i) {
                          return <option key={i} value={i}>{h}</option>;
                        })}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="mapping-section">
                <h3 className="mapping-section-title">Дополнительные поля</h3>
                {OPTIONAL_COLUMNS.map(function (col) {
                  return (
                    <div key={col.key} className={"mapping-row" + (mapping[col.key] !== undefined ? " mapped" : "")}>
                      <div className="mapping-left">
                        <span className="mapping-icon">{col.icon}</span>
                        <div className="mapping-label">{col.label}</div>
                      </div>
                      <div className="mapping-arrow">{mapping[col.key] !== undefined ? "✅" : "→"}</div>
                      <select
                        className="mapping-select"
                        value={mapping[col.key] !== undefined ? mapping[col.key] : ""}
                        onChange={function (e) { updateMapping(col.key, e.target.value); }}
                      >
                        <option value="">— Пропустить —</option>
                        {headers.map(function (h, i) {
                          return <option key={i} value={i}>{h}</option>;
                        })}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="import-actions">
              <button className="import-btn secondary" onClick={resetAll}>← Назад</button>
              <button className="import-btn primary" onClick={function () { setStep(3); }} disabled={!canImport()}>
                Далее: Предпросмотр →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview */}
        {step === 3 && (
          <div className="import-card glass-card">
            <div className="import-card-header">
              <div>
                <h2>👁️ Предпросмотр импорта</h2>
                <p className="import-card-desc">Проверьте данные перед импортом • Первые 5 строк</p>
              </div>
            </div>

            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {REQUIRED_COLUMNS.concat(OPTIONAL_COLUMNS).filter(function (col) {
                      return mapping[col.key] !== undefined;
                    }).map(function (col) {
                      return <th key={col.key}>{col.icon} {col.label}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {getMappedPreview().map(function (row, i) {
                    return (
                      <tr key={i}>
                        {REQUIRED_COLUMNS.concat(OPTIONAL_COLUMNS).filter(function (col) {
                          return mapping[col.key] !== undefined;
                        }).map(function (col) {
                          return <td key={col.key}>{row[col.key]}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="preview-stats">
              <div className="preview-stat">
                <span className="preview-stat-icon">📊</span>
                <span className="preview-stat-label">Всего строк</span>
                <span className="preview-stat-value">{rows.length}</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat-icon">✅</span>
                <span className="preview-stat-label">Маппинг полей</span>
                <span className="preview-stat-value">{Object.keys(mapping).length}</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat-icon">📅</span>
                <span className="preview-stat-label">Файл</span>
                <span className="preview-stat-value">{file.name}</span>
              </div>
            </div>

            {error && <div className="import-error">⚠️ {error}</div>}

            <div className="import-actions">
              <button className="import-btn secondary" onClick={function () { setStep(2); }}>← Маппинг</button>
              <button className="import-btn primary" onClick={startImport} disabled={importing}>
                {importing ? (
                  <span><span className="loader-spinner small" /> Импортируем...</span>
                ) : (
                  "🚀 Импортировать " + rows.length + " строк"
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 4 && result && (
          <div className="import-card glass-card">
            <div className="import-success">
              <div className="success-icon">🎉</div>
              <h2 className="success-title">Импорт завершён!</h2>
              <p className="success-desc">Данные успешно загружены в систему</p>

              <div className="success-stats">
                <div className="success-stat">
                  <span className="success-stat-num">{result.imported}</span>
                  <span className="success-stat-label">Импортировано</span>
                </div>
                <div className="success-stat">
                  <span className="success-stat-num">{result.skipped}</span>
                  <span className="success-stat-label">Пропущено</span>
                </div>
                {result.projects && result.projects.length > 0 && (
                  <div className="success-stat">
                    <span className="success-stat-num">{result.projects.length}</span>
                    <span className="success-stat-label">Проектов</span>
                  </div>
                )}
                {result.periods && result.periods.length > 0 && (
                  <div className="success-stat">
                    <span className="success-stat-num">{result.periods.length}</span>
                    <span className="success-stat-label">Периодов</span>
                  </div>
                )}
              </div>

              <div className="success-actions">
                <button className="import-btn primary" onClick={function () { window.location.href = "/dashboard"; }}>
                  📊 Перейти в дашборд
                </button>
                <button className="import-btn secondary" onClick={resetAll}>
                  📎 Загрузить ещё
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <AiFloatingButton />
    </DkrsAppShell>
  );
}
