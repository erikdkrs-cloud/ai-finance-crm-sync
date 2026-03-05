import React, { useState, useEffect } from 'react';
import DkrsAppShell from '../components/DkrsAppShell';
import HighlightCard from '../components/HighlightCard';
import RiskBadge from '../components/RiskBadge';
import { fmtMoney, fmtPct } from '../lib/format';

// Иконки для аномалий
const AnomalyIcon = ({ reason }) => {
  const iconMap = {
    'Штрафы': '⚖️',
    'Высокие расходы на рекламу': '📈',
    'Низкая маржинальность': '📉',
  };
  return <span title={reason}>{iconMap[reason] || '⚠️'}</span>;
};


const Summary = () => {
  const [data, setData] = useState({ top_profitable: [], top_unprofitable: [], anomalies: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');

  // Загрузка доступных месяцев
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

  // Загрузка данных для сводки
  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    fetch(`/api/summary?month=${selectedMonth}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setData(data);
        } else {
          throw new Error(data.error || 'Ошибка загрузки данных');
        }
        setError(null);
      })
      .catch(err => {
        setError(err.message);
        setData({ top_profitable: [], top_unprofitable: [], anomalies: [] });
      })
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  return (
    <DkrsAppShell>
      <div className="dashboard-header">
        <h1>Сводка и Аномалии</h1>
        <p>Ключевые успехи, проблемы и точки роста за выбранный период</p>
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
      </div>

      {loading ? (
        <div className="centered-message">Анализируем данные...</div>
      ) : error ? (
        <div className="centered-message">{error}</div>
      ) : (
        <>
          <div className="summary-grid">
            <div className="summary-section">
              <h2>Топ-3 Прибыльных</h2>
              <div className="highlight-grid">
                {data.top_profitable.map(p => <HighlightCard key={p.project} project={p} variant="profit" />)}
              </div>
            </div>
            <div className="summary-section">
              <h2>Топ-3 Убыточных</h2>
              <div className="highlight-grid">
                {data.top_unprofitable.map(p => <HighlightCard key={p.project} project={p} variant="loss" />)}
              </div>
            </div>
          </div>
          
          <div className="summary-section">
            <h2>Зона Внимания: Аномалии</h2>
            <div className="glass-card table-container">
              <table className="dkrs-table">
                <thead>
                  <tr>
                    <th>Проект</th>
                    <th>Причина</th>
                    <th>Значение</th>
                    <th>Риск</th>
                  </tr>
                </thead>
                <tbody>
                  {data.anomalies.length > 0 ? data.anomalies.map((item, index) => (
                    <tr key={index}>
                      <td className="project-name">{item.project}</td>
                      <td className="anomaly-reason"><AnomalyIcon reason={item.reason} /> {item.reason}</td>
                      <td className={item.reason.includes('Низкая') ? 'negative-value' : ''}>
                        {item.reason.includes('Низкая') ? fmtPct(item.value) : fmtMoney(item.value, 0)}
                      </td>
                      <td><RiskBadge riskLevel={item.risk} /></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" style={{textAlign: 'center', padding: '40px'}}>Аномалий не найдено. Отличная работа!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="summary-section">
            <h2>Подсказки для AI</h2>
            <div className="ai-prompts-card glass-card">
              <p>Быстрые вопросы для AI по текущему периоду ({selectedMonth})</p>
              <div className="prompts-grid">
                <div className="prompt-tag">Подведи итоги за {selectedMonth}</div>
                <div className="prompt-tag">Где низкая маржа и почему?</div>
                <div className="prompt-tag">Какие проекты убыточны и что делать?</div>
                <div className="prompt-tag">Предложи план оптимизации расходов</div>
              </div>
            </div>
          </div>
        </>
      )}

    </DkrsAppShell>
  );
};

export default Summary;
