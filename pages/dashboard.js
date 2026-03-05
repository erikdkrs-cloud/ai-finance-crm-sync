import React, { useState, useEffect, useMemo } from 'react';
import DkrsAppShell from '../components/DkrsAppShell';
import KpiCard from '../components/KpiCard';
import RiskBadge from '../components/RiskBadge';
import { fmtMoney, fmtPct, getProjectColorFromString } from '../lib/format';

const Dashboard = () => {
  const [data, setData] = useState({ totals: {}, projects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'profit', order: 'desc' });
  const [expandedRow, setExpandedRow] = useState(null);

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
    setExpandedRow(null);
    fetch(`/api/dashboard?month=${selectedMonth}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setError(null);
      })
      .catch(err => {
        setError('Не удалось загрузить данные.');
        setData({ totals: {}, projects: [] });
      })
      .finally(() => setLoading(false));
  }, [selectedMonth]);
  
  const handleSort = (key) => {
    let order = 'desc';
    if (sortConfig.key === key && sortConfig.order === 'desc') {
      order = 'asc';
    }
    setSortConfig({ key, order });
  };
  
  const filteredAndSortedProjects = useMemo(() => {
    if (!data.projects || !Array.isArray(data.projects)) return [];
    
    let processedProjects = [...data.projects]
      .filter(p => (p.project || '').toLowerCase().includes(searchTerm.toLowerCase()));

    processedProjects.sort((a, b) => {
      const aVal = a[sortConfig.key] || 0;
      const bVal = b[sortConfig.key] || 0;
      if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    return processedProjects;
  }, [data.projects, searchTerm, sortConfig]);

  const kpiData = [
    { title: 'Выручка', value: fmtMoney(data.totals?.revenue || 0), icon: 'revenue', trend: '+2.1%' },
    { title: 'Расходы', value: fmtMoney(data.totals?.costs || 0), icon: 'costs', trend: '+1.5%' },
    { title: 'Прибыль', value: fmtMoney(data.totals?.profit || 0), icon: 'profit', trend: '+8.3%' },
    { title: 'Маржа', value: fmtPct(data.totals?.margin || 0), icon: 'margin', trend: '+0.5%' }
  ];

  const tableHeaders = [
    { key: 'project', label: 'Проект' },
    { key: 'revenue', label: 'Выручка' },
    { key: 'costs', label: 'Расходы' },
    { key: 'profit', label: 'Прибыль' },
    { key: 'margin', label: 'Маржа' },
    { key: 'risk', label: 'Риск' }
  ];

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <span className="sort-icon">▲▼</span>;
    return <span className="sort-icon">{sortConfig.order === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <DkrsAppShell>
      <div className="dashboard-header">
        <h1>Обзор финансов</h1>
        <p>Ключевые показатели и детальная информация по проектам за выбранный период</p>
      </div>

      <div className="kpi-grid">
        {kpiData.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
      </div>

      <div className="controls-bar">
        <select 
          className="dkrs-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          disabled={months.length === 0}
        >
          {months.length > 0 ? (
             months.map(month => <option key={month} value={month}>{month}</option>)
          ) : ( <option>Загрузка...</option> )}
        </select>
        <input 
          type="text"
          className="dkrs-input"
          placeholder="Поиск по названию проекта..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flexGrow: 1, minWidth: '250px' }}
        />
      </div>

      <div className="glass-card table-container">
        {loading ? (
          <div className="centered-message">Загрузка данных...</div>
        ) : error ? (
          <div className="centered-message">{error}</div>
        ) : (
          <table className="dkrs-table">
            <thead>
              <tr>
                {tableHeaders.map(({ key, label }) => (
                  <th key={key} onClick={() => handleSort(key)} className={sortConfig.key === key ? 'active' : ''}>
                    {label} {renderSortIcon(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProjects.map((p, index) => (
                <React.Fragment key={p.project + index}>
                  <tr className="main-row" onClick={() => setExpandedRow(expandedRow === index ? null : index)}>
                    <td className="project-name">
                      <span className="project-color-dot" style={{ backgroundColor: getProjectColorFromString(p.project) }}></span>
                      {p.project || 'Проект без названия'}
                    </td>
                    <td>{fmtMoney(p.revenue, 0)}</td>
                    <td>{fmtMoney(p.costs, 0)}</td>
                    <td className={p.profit >= 0 ? 'positive-value' : 'negative-value'}>{fmtMoney(p.profit, 0)}</td>
                    <td className={p.margin >= 0 ? 'positive-value' : 'negative-value'}>{fmtPct(p.margin)}</td>
                    <td><RiskBadge riskLevel={p.risk} /></td>
                  </tr>
                  <tr className={`details-row ${expandedRow === index ? 'expanded' : ''}`}>
                    <td colSpan={tableHeaders.length}>
                      <div className="details-content">
                        <h4>Детализация расходов:</h4>
                        <div className="details-grid">
                          <div>
                            <span>Персонал</span>
                            <strong>{fmtMoney(p.labor, 0)}</strong>
                          </div>
                          <div>
                            <span>Реклама</span>
                            <strong>{fmtMoney(p.ads, 0)}</strong>
                          </div>
                           <div>
                            <span>Транспорт</span>
                            <strong>{fmtMoney(p.transport, 0)}</strong>
                          </div>
                          <div>
                            <span>Штрафы</span>
                            <strong className="negative-value">{fmtMoney(p.penalties, 0)}</strong>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DkrsAppShell>
  );
};

export default Dashboard;
