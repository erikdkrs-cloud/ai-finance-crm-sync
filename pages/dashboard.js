import React, { useState, useEffect, useMemo } from 'react';
import DkrsAppShell from '../components/DkrsAppShell';
import RiskBadge from '../components/RiskBadge';
import { fmtMoney, fmtPct } from '../lib/format';

const Dashboard = () => {
  const [data, setData] = useState({ totals: {}, projects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'profit', order: 'desc' });

  const riskLevels = {
    All: 'Все',
    Green: 'Низкий',
    Yellow: 'Средний',
    Red: 'Высокий',
  };

  // Load months
  useEffect(() => {
    fetch('/api/months')
      .then((r) => r.json())
      .then((d) => {
        const list = d?.months || d || [];
        const arr = Array.isArray(list) ? list : [];
        // support both [{month:"2024-01"},...] and ["2024-01",...]
        const normalized = arr.map((x) => (typeof x === 'string' ? x : x.month));
        setMonths(normalized);
        if (normalized.length > 0) setSelectedMonth(normalized[0]);
        else setLoading(false);
      })
      .catch(() => {
        setError('Не удалось загрузить список месяцев.');
        setLoading(false);
      });
  }, []);

  // Load dashboard data
  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    fetch(`/api/dashboard?month=${selectedMonth}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(() => {
        setError('Не удалось загрузить данные.');
        setData({ totals: {}, projects: [] });
      })
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  // Filter + sort
  const filteredProjects = useMemo(() => {
    if (!data.projects || !Array.isArray(data.projects)) return [];

    let list = data.projects
      .filter((p) =>
        (p.project || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((p) => {
        if (riskFilter === 'All') return true;
        return (p.risk || '').toLowerCase() === riskFilter.toLowerCase();
      });

    list.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0;
      const bVal = b[sortConfig.key] ?? 0;
      if (typeof aVal === 'string') {
        return sortConfig.order === 'asc'
          ? aVal.localeCompare(bVal, 'ru')
          : bVal.localeCompare(aVal, 'ru');
      }
      return sortConfig.order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return list;
  }, [data.projects, searchTerm, riskFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, order: prev.order === 'asc' ? 'desc' : 'asc' }
        : { key, order: 'desc' }
    );
  };

  const sortArrow = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.order === 'asc' ? ' ↑' : ' ↓';
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

  const handleSortChange = (e) => {
    const [key, order] = e.target.value.split('-');
    setSortConfig({ key, order });
  };

  return (
    <DkrsAppShell>
      {/* Month selector */}
      {months.length > 1 && (
        <div className="month-selector-bar">
          <label>Период:</label>
          <select
            className="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      <div className="projects-card-wrapper">
        <div className="projects-card glass-card">
          {/* Header */}
          <div className="projects-header">
            <div className="header-text">
              <h2>Проекты</h2>
              <p>Поиск • фильтры риска • сортировка — в одной карточке</p>
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

          {/* Controls */}
          <div className="projects-controls">
            <input
              type="text"
              className="dkrs-input search-input"
              placeholder="Поиск проекта..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="filter-buttons">
              {Object.entries(riskLevels).map(([key, label]) => (
                <button
                  key={key}
                  className={`filter-btn ${riskFilter === key ? 'active' : ''}`}
                  onClick={() => setRiskFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              className="dkrs-select sort-select"
              value={`${sortConfig.key}-${sortConfig.order}`}
              onChange={handleSortChange}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="projects-table-wrapper">
            {loading ? (
              <div className="centered-message">Загрузка данных...</div>
            ) : error ? (
              <div className="centered-message">{error}</div>
            ) : (
              <table className="dkrs-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('project')} style={{ cursor: 'pointer' }}>
                      Проект{sortArrow('project')}
                    </th>
                    <th onClick={() => handleSort('revenue')} style={{ cursor: 'pointer' }}>
                      Выручка{sortArrow('revenue')}
                    </th>
                    <th onClick={() => handleSort('costs')} style={{ cursor: 'pointer' }}>
                      Расход{sortArrow('costs')}
                    </th>
                    <th onClick={() => handleSort('profit')} style={{ cursor: 'pointer' }}>
                      Прибыль{sortArrow('profit')}
                    </th>
                    <th onClick={() => handleSort('margin')} style={{ cursor: 'pointer' }}>
                      Маржа{sortArrow('margin')}
                    </th>
                    <th>Риск</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((p, i) => (
                      <tr key={p.project + i}>
                        <td className="project-name">{p.project || '—'}</td>
                        <td>{fmtMoney(p.revenue, 0)}</td>
                        <td>{fmtMoney(p.costs, 0)}</td>
                        <td className={p.profit >= 0 ? 'positive-value' : 'negative-value'}>
                          {fmtMoney(p.profit, 0)}
                        </td>
                        <td className={p.margin >= 0 ? 'positive-value' : 'negative-value'}>
                          {fmtPct(p.margin)}
                        </td>
                        <td><RiskBadge riskLevel={p.risk} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--dkrs-text-tertiary)' }}>
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
    </DkrsAppShell>
  );
};

export default Dashboard;
