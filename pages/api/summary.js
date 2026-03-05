import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ error: "Параметр month обязателен" });
  }

  try {
    // Получаем period_id для указанного месяца
    const periods = await sql`
      SELECT id FROM periods WHERE month = ${month} LIMIT 1
    `;

    if (periods.length === 0) {
      return res.status(404).json({ error: "Месяц не найден" });
    }

    const periodId = periods[0].id;

    // Получаем все финансовые строки за этот период с именами проектов
    const rows = await sql`
      SELECT
        p.name AS project,
        f.revenue_no_vat,
        f.salary_workers,
        f.salary_manager,
        f.salary_head,
        f.ads,
        f.transport,
        f.penalties,
        f.tax
      FROM financial_rows f
      JOIN projects p ON p.id = f.project_id
      WHERE f.period_id = ${periodId}
    `;

    // Считаем costs, profit, margin для каждого проекта
    const projects = rows.map((r) => {
      const revenue = Number(r.revenue_no_vat) || 0;
      const costs =
        (Number(r.salary_workers) || 0) +
        (Number(r.salary_manager) || 0) +
        (Number(r.salary_head) || 0) +
        (Number(r.ads) || 0) +
        (Number(r.transport) || 0) +
        (Number(r.penalties) || 0) +
        (Number(r.tax) || 0);
      const profit = revenue - costs;
      const margin = revenue > 0 ? profit / revenue : 0;

      return {
        project: r.project,
        revenue,
        costs,
        profit,
        margin,
        penalties: Number(r.penalties) || 0,
        ads: Number(r.ads) || 0,
      };
    });

    // 1. Топ-3 прибыльных
    const top_profitable = [...projects]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3);

    // 2. Топ-3 убыточных
    const top_unprofitable = [...projects]
      .filter((p) => p.profit < 0)
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 3);

    // 3. Аномалии
    const anomalies = projects
      .map((p) => {
        const projectAnomalies = [];

        if (p.penalties > 0) {
          projectAnomalies.push({ type: "Штрафы", value: p.penalties });
        }
        if (p.revenue > 0 && p.ads / p.revenue > 0.05 && p.ads > 50000) {
          projectAnomalies.push({
            type: "Высокие расходы на рекламу",
            value: p.ads,
          });
        }
        if (p.margin < 0.1 && p.revenue > 100000) {
          projectAnomalies.push({
            type: "Низкая маржинальность",
            value: p.margin,
          });
        }

        return projectAnomalies.length > 0
          ? { project: p.project, anomalies: projectAnomalies }
          : null;
      })
      .filter(Boolean);

    // Плоский список аномалий
    const flatAnomalies = anomalies.flatMap((item) =>
      item.anomalies.map((anomaly) => ({
        project: item.project,
        reason: anomaly.type,
        value: anomaly.value,
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
    console.error("Summary API error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}
