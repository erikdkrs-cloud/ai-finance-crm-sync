import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ error: 'Month parameter is required' });
  }

  try {
    // Получаем все проекты за указанный месяц
    const { rows: projects } = await sql`
      SELECT 
        project, 
        revenue, 
        costs, 
        profit, 
        margin,
        penalties,
        ads,
        risk
      FROM financial_data WHERE month = ${month};
    `;

    // 1. Находим Топ-3 прибыльных
    const top_profitable = [...projects]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3);

    // 2. Находим Топ-3 убыточных
    const top_unprofitable = [...projects]
      .filter(p => p.profit < 0)
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 3);

    // 3. Находим аномалии (ИСПРАВЛЕНО: убрана лишняя операция)
    const anomalies = projects.map(p => {
      const projectAnomalies = [];
      if (p.penalties > 0) {
        projectAnomalies.push({ type: 'Штрафы', value: p.penalties });
      }
      if (p.revenue > 0 && p.ads / p.revenue > 0.05 && p.ads > 50000) {
        projectAnomalies.push({ type: 'Высокие расходы на рекламу', value: p.ads });
      }
      if (p.margin < 0.10 && p.revenue > 100000) {
        projectAnomalies.push({ type: 'Низкая маржинальность', value: p.margin });
      }
      return projectAnomalies.length > 0 ? { project: p.project, risk: p.risk, anomalies: projectAnomalies } : null;
    }).filter(Boolean); // <-- Вот здесь была ошибка, я ее исправил.

    // Преобразуем аномалии в плоский список для удобного отображения
    const flatAnomalies = anomalies.flatMap(item => 
        item.anomalies.map(anomaly => ({
            project: item.project,
            risk: item.risk,
            reason: anomaly.type,
            value: anomaly.value
        }))
    );


    res.status(200).json({
      ok: true,
      month,
      top_profitable,
      top_unprofitable,
      anomalies: flatAnomalies,
    });
  } catch (error) {
    console.error('Error fetching summary data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
