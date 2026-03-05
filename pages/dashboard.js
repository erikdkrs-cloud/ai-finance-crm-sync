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
  const [riskFilter, setRiskFilter] = useState('All'); // 'All', 'Green', 'Yellow', 'Red'
  const [sortConfig, setSortConfig] = useState({ key: 'profit', order: 'desc' });

  const riskLevels = {
    All: 'Все',
    Green: 'Низкий',
    Yellow: 'Средний',
    Red: 'Высокий'
  };

  useEffect(() => {
    fetch('/api/months')
      .then(res => res.json())
      .then(data => {
        if (data && data.months) {
          setMonths(data.months);
          if (data.months.length > 0) {
            setSelectedMonth(data.months[0]);
          } else { setLoading(false); }
        }
      })
      .catch(err => {
        setError('Не удалось загрузить список месяцев.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    fetch(`/api/dashboard?month=${selectedMonth}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setError(null);
      })
      .catch(err => {
        setError('Не удалось загрузить данные для выбранного месяца.');
        setData({ totals: {}, projects: [] });
      })
      .finally(() => setLoading(false));
  }, [selectedMonth]);
  
  const filteredAndSortedProjects = useMemo(() => {
    if (!data.projects || !Array.isArray(data.projects)) return [];

    let processedProjects = data.projects
      .filter(p => (p.project || '').toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(p => {
        if (riskFilter === 'All') return true;
        return (p.risk || '').toLowerCase() === riskFilter.toLowerCase();
      });
    
    processedProjects.sort((a, b) => {
      const aVal = a[sortConfig.key] || 0;
      const bVal = b[sortConfig.key] || 0;
      if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    return processedProjects;
  }, [data.projects, searchTerm, riskFilter, sortConfig]);

  const handleSortChange = (e) => {
    const [key, order] = e.target.value.split('-');
    setSortConfig({ key, order });
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

  return (
    <DkrsAppShell>
      <div className="projects-card-wrapper">
        <div className="projects-card glass-card">
          <div className="projects-header">
            <div className="header-text">
              <h2>Проекты</h2>
              <p>Поиск • фильтры риска • сортировка — в одной карточке</p>
            </div>
            <div className="header-summary">
               <div className="summary-badge revenue">Выручка: <strong>{fmtMoney(data.totals?.revenue || 0)}</strong></div>
               <div className="summary-badge profit">Прибыль: <strong>{fmtMoney(data.totals?.profit || 0)}</strong></div>
               <div className="summary-badge margin">Маржа: <strong>{fmtPct(data.totals?.margin || 0)}</strong></div>
            </div>
          </div>
          
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
              {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="projects-table-wrapper">
            {loading ? (
              <div className="centered-message">Загрузка данных...</div>
            ) : error ? (
              <div className="centered-message">{error}</div>
            ) : (
              <table className="dkrs-table">
                <thead>
                  <tr>
                    <th>Проект</th>
                    <th>Выручка</th>
                    <th>Расход</th>
                    <th>Прибыль</th>
                    <th>Маржа</th>
                    <th>Риск</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedProjects.length > 0 ? (
                    filteredAndSortedProjects.map((p, index) => (
                      <tr key={p.project + index}>
                        <td className="project-name">{p.project || 'Проект без названия'}</td>
                        <td>{fmtMoney(p.revenue, 0)}</td>
                        <td>{fmtMoney(p.costs, 0)}</td>
                        <td className={p.profit >= 0 ? 'positive-value' : 'negative-value'}>{fmtMoney(p.profit, 0)}</td>
                        <td className={p.margin >= 0 ? 'positive-value' : 'negative-value'}>{fmtPct(p.margin)}</td>
                        <td><RiskBadge riskLevel={p.risk} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Проекты не найдены.</td></tr>
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
