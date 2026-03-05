import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DkrsAppShell from '../components/DkrsAppShell';
import AiFloatingButton from '../components/AiFloatingButton';
import { fmtMoney, fmtPct } from '../lib/format';

const MEDALS = ['🥇', '🥈', '🥉'];

function TopCard({ project, index, variant }) {
  const isProfit = variant === 'profit';
  const profit = Number(project.profit) || 0;
  const margin = Number(project.margin) || 0;
  const gradients = isProfit
    ? ['linear-gradient(135deg, #00b09b, #96c93d)', 'linear-gradient(135deg, #11998e, #38ef7d)', 'linear-gradient(135deg, #56ab2f, #a8e063)']
    : ['linear-gradient(135deg, #eb3349, #f45c43)', 'linear-gradient(135deg, #e44d26, #f16529)', 'linear-gradient(135deg, #c0392b, #e74c3c)'];

  return (
    <div className={`top-card ${variant}`} style={{ animationDelay: `${index * 120}ms` }}>
      <div className="top-card-medal" style={{ background: gradients[index] || gradients[0] }}>
        <span>{MEDALS[index] || (index + 1)}</span>
      </div>
      <div className="top-card-info">
        <div className="top-card-name">{project.project}</div>
        <div className="top-card-meta">
          <span>Выручка: {fmtMoney(project.revenue, 0)} ₽</span>
          <span>Маржа: {fmtPct(margin)}</span>
        </div>
      </div>
      <div className={`top-card-value ${isProfit ? 'positive-value' : 'negative-value'}`}>
        {profit >= 0 ? '+' : ''}{fmtMoney(profit, 0)} ₽
      </div>
    </div>
  );
}

function ExpenseBar({ totals }) {
  if (!totals || totals.costs <= 0) return null;
  const items = [
    { label: 'ЗП сотрудников', value: Number(totals.salary_workers || totals.labor || 0), color: '#667eea' },
    { label: 'ЗП менеджмент', value: Number(totals.salary_manager || totals.team_payroll || 0), color: '#7c4dff' },
    { label: 'ЗП руководители', value: Number(totals.salary_head || 0), color: '#a78bfa' },
    { label: 'Реклама', value: Number(totals.ads || 0), color: '#f59e0b' },
    { label: 'Транспорт', value: Number(totals.transport || 0), color: '#06b6d4' },
    { label: 'Штрафы', value: Number(totals.penalties || 0), color: '#ef4444' },
    { label: 'Налоги', value: Number(totals.tax || 0), color: '#64748b' },
  ];
  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="expense-bar-widget">
      <div className="expense-stacked-bar">
        {items.map((item, i) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          if (pct < 0.5) return null;
          return (
            <div
              key={i}
              className="expense-bar-segment"
              style={{ width: `${pct}%`, background: item.color }}
              title={`${item.label}: ${fmtMoney(item.value, 0)} ₽ (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div className="expense-legend">
        {items.filter(i => i.value > 0).map((item, i) => (
          <div key={i} className="expense-legend-item" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="expense-legend-dot" style={{ background: item.color }} />
            <span className="expense-legend-label">{item.label}</span>
            <span className="expense-legend-value">{fmtMoney(item.value, 0)} ₽</span>
            <span className="expense-legend-pct">{((item.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskRing({ count, total, color, label }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="risk-ring-item">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="8" />
        <circle
          cx="44" cy="44" r="36" fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 44 44)" className="risk-ring-progress"
        />
        <text x="44" y="40" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{count}</text>
        <text x="44" y="56" textAnchor="middle" fontSize="10" fill="#94a3b8">{pct.toFixed(0)}%</text>
      </svg>
      <span className="risk-ring-label">{label}</span>
    </div>
  );
}

function formatAnomalyValue(item) {
  if (!item) return '';
  const val = Number(item.value) || 0;
  if (item.reason && item.reason.includes('маржинальность')) {
    return fmtPct(val);
  }
  return fmtMoney(val, 0) + ' ₽';
}

export default function Summary() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
      .catch(() => { setError('Не удалось загрузить месяцы'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    fetch(`/api/summary?month=${selectedMonth}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setData(d); setError(null); }
        else throw new Error(d.error || 'Ошибка');
      })
      .catch((e) => { setError(e.message); setData(null); })
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  const totalProjects = data?.projects?.length || 0;
  const riskDist = data?.riskDistribution || { green: 0, yellow: 0, red: 0 };

  return (
    <DkrsAppShell>
      <div className={`summary-page ${mounted ? 'mounted' : ''}`}>
        <div className="summary-page-header">
          <div>
            <h1 className="summary-title">📋 Сводка и аналитика</h1>
            <p className="summary-subtitle">Ключевые показатели, лидеры, аномалии и инсайты за период</p>
          </div>
          {months.length > 1 && (
            <select className="month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="centered-message"><div className="loader-spinner" /><span>Анализируем данные...</span></div>
        ) : error ? (
          <div className="centered-message error">{error}</div>
        ) : data ? (
          <>
            <div className="summary-two-cols">
              <div className="summary-widget glass-card">
                <div className="widget-header">
                  <h3>🏆 Топ-3 прибыльных</h3>
                  <span className="widget-badge green">Лидеры</span>
                </div>
                <div className="top-cards-list">
                  {(data.top_profitable || []).map((p, i) => <TopCard key={p.project} project={p} index={i} variant="profit" />)}
                  {(!data.top_profitable || data.top_profitable.length === 0) && <div className="empty-widget">Нет данных</div>}
                </div>
              </div>
              <div className="summary-widget glass-card">
                <div className="widget-header">
                  <h3>📉 Топ-3 убыточных</h3>
                  <span className="widget-badge red">Внимание</span>
                </div>
                <div className="top-cards-list">
                  {(data.top_unprofitable || []).map((p, i) => <TopCard key={p.project} project={p} index={i} variant="loss" />)}
                  {(!data.top_unprofitable || data.top_unprofitable.length === 0) && <div className="empty-widget">Нет убыточных</div>}
                </div>
              </div>
            </div>

            <div className="summary-two-cols">
              <div className="summary-widget glass-card">
                <div className="widget-header">
                  <h3>🎯 Распределение рисков</h3>
                  <span className="widget-badge neutral">{totalProjects} проектов</span>
                </div>
                <div className="risk-rings-row">
                  <RiskRing count={riskDist.green} total={totalProjects} color="#10b981" label="Низкий" />
                  <RiskRing count={riskDist.yellow} total={totalProjects} color="#f59e0b" label="Средний" />
                  <RiskRing count={riskDist.red} total={totalProjects} color="#ef4444" label="Высокий" />
                </div>
              </div>
              <div className="summary-widget glass-card">
                <div className="widget-header">
                  <h3>📊 Структура расходов</h3>
                  <span className="widget-badge neutral">{fmtMoney(data.totals?.costs || 0, 0)} ₽</span>
                </div>
                <ExpenseBar totals={data.totals} />
              </div>
            </div>

            <div className="summary-widget glass-card full-width">
              <div className="widget-header">
                <h3>⚠️ Зона внимания: Аномалии</h3>
                <span className="widget-badge orange">{data.anomalies?.length || 0} найдено</span>
              </div>
              <div className="projects-table-wrapper">
                <table className="dkrs-table">
                  <thead>
                    <tr><th>Проект</th><th>Причина</th><th>Значение</th></tr>
                  </thead>
                  <tbody>
                    {data.anomalies && data.anomalies.length > 0 ? (
                      data.anomalies.map((item, i) => (
                        <tr key={i} className="table-row-animated" style={{ animationDelay: `${i * 50}ms` }}>
                          <td className="project-name">{item.project}</td>
                          <td>
                            <span className="anomaly-chip">
                              {item.reason === 'Штрафы' && '⚖️'}
                              {item.reason === 'Высокие расходы на рекламу' && '📢'}
                              {item.reason && item.reason.includes('маржинальность') && '📉'}
                              {' '}{item.reason}
                            </span>
                          </td>
                          <td className={item.reason && item.reason.includes('маржинальность') ? 'negative-value' : ''}>
                            {formatAnomalyValue(item)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className="empty-state"><div className="empty-icon">🎉</div>Аномалий не найдено!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="summary-two-cols">
              <div className="summary-widget glass-card">
                <div className="widget-header"><h3>💡 Быстрые инсайты</h3></div>
                <div className="insights-list">
                  {(data.insights || []).map((ins, i) => (
                    <div key={i} className="insight-item" style={{ animationDelay: `${i * 80}ms` }}>
                      <span className="insight-icon">{ins.icon}</span>
                      <span className="insight-text">{ins.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="summary-widget glass-card">
                <div className="widget-header"><h3>🤖 Спросите AI</h3></div>
                <p className="ai-prompts-desc">Быстрые вопросы по периоду <strong>{selectedMonth}</strong></p>
                <div className="prompts-grid">
                  {[
                    `Подведи итоги за ${selectedMonth}`,
                    'Где низкая маржа и почему?',
                    'Какие проекты убыточны и что делать?',
                    'Предложи план оптимизации расходов',
                    'Какие проекты самые рискованные?',
                    'Сравни расходы на рекламу',
                  ].map((q, i) => (
                    <button key={i} className="prompt-tag" onClick={() => router.push('/assistant')} style={{ animationDelay: `${i * 60}ms` }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <AiFloatingButton />
    </DkrsAppShell>
  );
}
