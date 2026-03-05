import React, { useState, useEffect, useMemo } from 'react';
import DkrsAppShell from '../components/DkrsAppShell';
import KpiCard from '../components/KpiCard';
import { fmtMoney, fmtPct } from '../lib/format';

const Dashboard = () => {
  const [data, setData] = useState({ totals: {}, projects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('profit');
  const [sortOrder, setSortOrder] = useState('desc');

  // --- DEBUG ---
  console.log('--- Component Render ---');
  console.log('State: loading:', loading);
  console.log('State: selectedMonth:', selectedMonth);
  console.log('State: months:', months);
  console.log('State: error:', error);
  // --- END DEBUG ---

  // Fetch available months on mount
  useEffect(() => {
    console.log('--- useEffect: Fetching months ---');
    fetch('/api/months')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('✅ SUCCESS /api/months response:', data);
        if (data && data.months) {
          setMonths(data.months);
          if (data.months.length > 0) {
            setSelectedMonth(data.months[0]);
            console.log(`Setting selected month to: ${data.months[0]}`);
          } else {
            console.log('No months found from API.');
            setLoading(false);
          }
        }
      })
      .catch(err => {
        console.error('❌ ERROR fetching /api/months:', err);
        setError('Не удалось загрузить список месяцев.');
        setLoading(false);
      });
  }, []);

  // Fetch dashboard data when selectedMonth changes
  useEffect(() => {
    if (!selectedMonth) {
      console.log('--- useEffect: Skipping dashboard fetch because selectedMonth is empty. ---');
      if (months.length === 0 && !loading) {
         // This case is handled by the other useEffect
      }
      return;
    }

    console.log(`--- useEffect: Fetching dashboard data for month: ${selectedMonth} ---`);
    setLoading(true);
    fetch(`/api/dashboard?month=${selectedMonth}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('✅ SUCCESS /api/dashboard response:', data);
        setData(data);
        setError(null);
      })
      .catch(err => {
        console.error(`❌ ERROR fetching /api/dashboard for month ${selectedMonth}:`, err);
        setError('Не удалось загрузить данные для выбранного месяца.');
        setData({ totals: {}, projects: [] });
      })
      .finally(() => {
        console.log('Setting loading to false.');
        setLoading(false);
      });
  }, [selectedMonth]); // Removed 'months' from dependency array to simplify logic
  
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedProjects = useMemo(() => {
    if (!data.projects || !Array.isArray(data.projects)) return [];
    let filtered = data.projects.filter(p => 
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data.projects, searchTerm, sortBy, sortOrder]);

  const kpiData = [
    { title: 'Выручка', value: fmtMoney(data.totals?.revenue_no_vat || 0), icon: 'revenue' },
    { title: 'Расходы', value: fmtMoney(data.totals?.total_costs || 0), icon: 'costs' },
    { title: 'Прибыль', value: fmtMoney(data.totals?.profit || 0), icon: 'profit' },
    { title: 'Маржа', value: fmtPct(data.totals?.margin || 0), icon: 'margin' }
  ];

  const tableHeaders = [
    { key: 'name', label: 'Проект' },
    { key: 'revenue_no_vat', label: 'Выручка' },
    { key: 'total_costs', label: 'Расходы' },
    { key: 'profit', label: 'Прибыль' },
    { key: 'margin', label: 'Маржа' }
  ];

  const renderSortIcon = (columnKey) => {
    if (sortBy !== columnKey) return <span className="sort-icon">▲▼</span>;
    return <span className="sort-icon">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <DkrsAppShell>
      <div className="dashboard-header">
        <h1>Обзор финансов</h1>
        <p>Ключевые показатели и детальная информация по проектам</p>
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
          ) : (
            <option>Загрузка месяцев...</option>
          )}
        </select>
        <input 
          type="text"
          className="dkrs-input"
          placeholder="Поиск по названию проекта..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flexGrow: 1, minWidth: '250px' }}
        />
        <button 
          className="dkrs-button secondary" 
          onClick={() => { setSearchTerm(''); setSortBy('profit'); setSortOrder('desc'); }}
        >
          Сбросить
        </button>
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
                  <th key={key} onClick={() => handleSort(key)} className={sortBy === key ? 'active' : ''}>
                    {label} {renderSortIcon(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProjects.length > 0 ? (
                filteredAndSortedProjects.map(p => (
                  <tr key={p.id}>
                    <td className="project
