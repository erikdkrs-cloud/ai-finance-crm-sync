import React, { useState, useEffect, useMemo, useRef } from 'react';
import DkrsAppShell from '../components/DkrsAppShell';
import RiskBadge from '../components/RiskBadge';
import AiFloatingButton from '../components/AiFloatingButton';
import { fmtMoney, fmtPct } from '../lib/format';

/* ---- animated counter hook ---- */
function useAnimatedNumber(target, duration = 900) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const t = Number(target) || 0;
    const start = value;
    const diff = t - start;
    if (Math.abs(diff) < 1) { setValue(t); return; }
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + diff * eased);
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target]);
  return value;
}

/* ---- KPI Card ---- */
function KpiCard({ icon, label, value, formatted, gradient, delay }) {
  return (
    <div className="kpi-card" style={{ '--kpi-gradient': gradient, animationDelay: `${delay}ms` }}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-info">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">{formatted}</span>
      </div>
      <div className="kpi-glow" />
    </div>
  );
}

/* ---- Expanded Row ---- */
function ExpandedRow({ p, maxRevenue }) {
  const items = [
    { label: 'Зарплата сотрудников', value: p.labor },
    { label: 'Зарплата руководства', value: p.team_payroll },
    { label: 'Реклама', value: p.ads },
    { label: 'Транспорт', value: p.transport },
    { label: 'Штрафы', value: p.penalties },
  ];
  return (
    <tr className="expanded-row">
      <td colSpan="6">
        <div className="expanded-content">
          <div className="expanded-grid">
            {items.map((item, i) => {
              const pct = p.costs > 0 ? ((item.value / p.costs) * 100) : 0;
              return (
                <div key={i} className="expanded-item" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="expanded-item-header">
                    <span className="expanded-item-label">{item.label}</span>
                    <span className="expanded-item-value">{fmtMoney(item.value, 0)}</span>
                  </div>
                  <div className="expanded-bar-track">
                    <div
                      className="expanded-bar-fill"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="expanded-item-pct">{pct.toFixed(1)}% от расходов</span>
                </div>
              );
            })}
          </div>
          <div className="expanded-summary">
            <div className="expanded-summary-item">
              <span>Выручка</span>
              <strong className="positive-value">{fmtMoney(p.revenue, 0)}</strong>
            </div>
            <div className="expanded-summary-item">
              <span>Расходы</span>
              <strong>{fmtMoney(p.costs, 0)}</strong>
            </div>
            <div className="expanded-summary-item">
              <span>Прибыль</span>
              <strong className={p.profit >= 0 ? 'positive-value' : 'negative-value'}>
                {fmtMoney(p.profit, 0)}
              </strong>
            </div>
            <div className="expanded-summary-item">
              <span>Маржа</span>
              <strong className={p.margin >= 0 ? 'positive-value' : 'negative-value'}>
                {fmtPct(p.margin)}
              </strong>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ---- Main Dashboard ---- */
const Dashboard = () => {
  const [data, setData] = useState({ totals: {}, projects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'profit', order: 'desc' });
  const [expandedRow, setExpandedRow] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const riskLevels = { All: 'Все', Green: 'Низкий', Yellow: 'Средний', Red: 'Высокий' };

  // animated KPI
  const animRevenue = useAnimatedNumber(data.totals?.revenue || 0);
  const animProfit = useAnimatedNumber(data.totals?.profit || 0);
  const animMargin = useAnimatedNumber((data.totals?.margin || 0) * 100);
  const animProjects = useAnimatedNumber(data.projects?.length || 0, 600);

  useEffect(() => {
    fetch('/api/months')
      .then((r) => r.json())
      .then((d) => {
        const list = d?.months || d || [];
        const arr = Array.isArray(list) ? list : [];
        const normalized = arr.map((x) => (typeof x === 'string' ? x : x.month));
        setMonths(normalized);
        if (normalized.length > 0) setSelectedMonth(normalized[0]);
        else setLoading(false);
      })
      .catch(() => { setError('Не удалось загрузить список месяцев.'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    setExpandedRow(null);
    fetch(`/api/dashboard?month=${selectedMonth}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setError(null); })
      .catch(() => { setError('Не удалось загрузить данные.'); setData({ totals: {}, projects: [] }); })
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  const filteredProjects = useMemo(() => {
    if (!data.projects || !Array.isArray(data.projects)) return [];
    let list = data.projects
      .filter((p) => (p.project || '').toLowerCase().includes(searchTerm.toLowerCase()))
      .filter((p) => {
        if (riskFilter === 'All') return true;
        return (p.risk || '').toLowerCase() === riskFilter.toLowerCase();
      });
    list.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0;
      const bVal = b[sortConfig.key] ?? 0;
      if (typeof aVal === 'string') {
        return sortConfig.order === 'asc' ? aVal.localeCompare(bVal, 'ru') : bVal.localeCompare(aVal, 'ru');
      }
      return sortConfig.order === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [data.projects, searchTerm, riskFilter, sortConfig]);

  const maxRevenue = useMemo(() => {
    return Math.max(...(data.projects || []).map(p => p.revenue || 0), 1);
  }, [data.projects]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key ? { key, order: prev.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'desc' }
    );
  };
  const sortArrow = (key) => {
    if (sortConfig.key !== key) return <span className="sort-arrow dim">⇅</span>;
    return <span className="sort-arrow active">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>;
  };

  const sortOptions = [
    { value: 'profit-desc', label: 'Прибыль ↓' },
    { value: 'profit-asc', label: 'Прибыль ↑' },
    { value: 'revenue-desc', label: 'Выручка ↓' },
    { value: 'revenue-asc', label: 'Выручка ↑' },
    { value: 'margin-desc', label: 'Маржа ↓' },
    { value: 'margin-asc', label: 'Маржа ↑' },
    { value: 'costs-desc', label: 'Расход ↓' },
    { value: 'costs-asc', label: 'Расход ↑' },
  ];

  const riskCounts = useMemo(() => {
    const counts = { All: 0, Green: 0, Yellow: 0, Red: 0 };
    (data.projects || []).forEach((p) => {
      counts.All++;
      const r = (p.risk || '').toLowerCase();
      if (r === 'green') counts.Green++;
      else if (r === 'yellow') counts.Yellow++;
      else if (r === 'red') counts.Red++;
    });
    return counts;
  }, [data.projects]);

  return (
    <DkrsAppShell>
      <div className={`dashboard-page ${mounted ? 'mounted' : ''}`}>
        {/* Month selector */}
        {months.length > 1 && (
          <div className="month-selector-bar">
            <label>📅 Период:</label>
            <select
              className="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {/* KPI Cards */}
        <div className="kpi-grid">
          <KpiCard
            icon="💰"
            label="Выручка"
            formatted={fmtMoney(animRevenue, 0)}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            delay={0}
          />
          <KpiCard
            icon="📈"
            label="Прибыль"
            formatted={fmtMoney(animProfit, 0)}
            gradient="linear-gradient(135deg, #00b09b 0%, #96c93d 100%)"
            delay={100}
          />
          <KpiCard
            icon="📊"
            label="Маржа"
            formatted={`${animMargin.toFixed(1)}%`}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            delay={200}
          />
          <KpiCard
            icon="🏢"
            label="Проектов"
            formatted={Math.round(animProjects).toString()}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            delay={300}
          />
        </div>

        {/* Projects card */}
        <div className="projects-card-wrapper">
          <div className="projects-card glass-card">
            <div className="projects-header">
              <div className="header-text">
                <h2>Проекты</h2>
                <p>Нажмите на строку для детального анализа расходов</p>
              </div>
              <div className="header-summary">
                <div className="summary-badge revenue">
                  Выручка: <strong>{fmtMoney(data.totals?.revenue || 0, 2)}</strong>
                </div>
                <div className="summary-badge profit">
                  Прибыль: <strong>{fmtMoney(data.totals?.profit || 0, 2)}</strong>
                </div>
                <div className="summary-badge margin">
                  Маржа: <strong>{fmtPct(data.totals?.margin || 0)}</strong>
                </div>
              </div>
            </div>

            <div className="projects-controls">
              <div className="search-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="dkrs-input search-input"
                  placeholder="Поиск проекта..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-buttons">
                {Object.entries(riskLevels).map(([key, label]) => (
                  <button
                    key={key}
                    className={`filter-btn ${riskFilter === key ? 'active' : ''} ${key !== 'All' ? 'risk-' + key.toLowerCase() : ''}`}
                    onClick={() => setRiskFilter(key)}
                  >
                    {label}
                    <span className="filter-count">{riskCounts[key]}</span>
                  </button>
                ))}
              </div>
              <select
                className="dkrs-select sort-select"
                value={`${sortConfig.key}-${sortConfig.order}`}
                onChange={(e) => {
                  const [k, o] = e.target.value.split('-');
                  setSortConfig({ key: k, order: o });
                }}
              >
                {sortOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div className="projects-table-wrapper">
              {loading ? (
                <div className="centered-message">
                  <div className="loader-spinner" />
                  <span>Загрузка данных...</span>
                </div>
              ) : error ? (
                <div className="centered-message error">{error}</div>
              ) : (
                <table className="dkrs-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('project')} style={{ cursor: 'pointer' }}>
                        Проект {sortArrow('project')}
                      </th>
                      <th onClick={() => handleSort('revenue')} style={{ cursor: 'pointer' }}>
                        Выручка {sortArrow('revenue')}
                      </th>
                      <th onClick={() => handleSort('costs')} style={{ cursor: 'pointer' }}>
                        Расход {sortArrow('costs')}
                      </th>
                      <th onClick={() => handleSort('profit')} style={{ cursor: 'pointer' }}>
                        Прибыль {sortArrow('profit')}
                      </th>
                      <th onClick={() => handleSort('margin')} style={{ cursor: 'pointer' }}>
                        Маржа {sortArrow('margin')}
                      </th>
                      <th>Риск</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.length > 0 ? (
                      filteredProjects.map((p, i) => (
                        <React.Fragment key={p.project + i}>
                          <tr
                            className={`table-row-animated ${expandedRow === i ? 'row-expanded' : ''}`}
                            style={{ animationDelay: `${i * 40}ms` }}
                            onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                          >
                            <td className="project-name">
                              <span className="expand-icon">{expandedRow === i ? '▼' : '▶'}</span>
                              {p.project || '—'}
                            </td>
                            <td>
                              <div className="cell-with-bar">
                                <span>{fmtMoney(p.revenue, 0)}</span>
                                <div className="mini-bar">
                                  <div
                                    className="mini-bar-fill"
                                    style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td>{fmtMoney(p.costs, 0)}</td>
                            <td className={p.profit >= 0 ? 'positive-value' : 'negative-value'}>
                              {fmtMoney(p.profit, 0)}
                            </td>
                            <td className={p.margin >= 0 ? 'positive-value' : 'negative-value'}>
                              {fmtPct(p.margin)}
                            </td>
                            <td><RiskBadge riskLevel={p.risk} /></td>
                          </tr>
                          {expandedRow === i && <ExpandedRow p={p} maxRevenue={maxRevenue} />}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          <div className="empty-icon">📭</div>
                          Проекты не найдены
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <AiFloatingButton />
    </DkrsAppShell>
  );
};

export default Dashboard;
