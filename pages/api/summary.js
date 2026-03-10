import { neon } from "@neondatabase/serverless";
import { getUserProjectIds } from "../../lib/getUserProjects";

function num(x) { return Number(x || 0); }
function round2(x) { return Math.round(num(x) * 100) / 100; }

export default async function handler(req, res) {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ error: "Параметр month обязателен" });
  }

  try {
    const sql_conn = neon(process.env.DATABASE_URL);

    // Get user's allowed projects
    const projectIds = await getUserProjectIds(req);
    if (Array.isArray(projectIds) && projectIds.length === 0) {
      return res.status(200).json({
        ok: true, month, projects: [], top_profitable: [], top_unprofitable: [],
        anomalies: [], totals: { revenue:0, costs:0, profit:0, margin:0 },
        riskDistribution: { green:0, yellow:0, red:0 }, insights: [],
      });
    }

    const periods = await sql_conn`SELECT id FROM periods WHERE month = ${month} LIMIT 1`;
    if (periods.length === 0) {
      return res.status(404).json({ error: "Месяц не найден" });
    }
    const periodId = periods[0].id;

    let rows;
    if (projectIds === null) {
      rows = await sql_conn`
        SELECT p.name AS project, f.revenue_no_vat, f.salary_workers, f.salary_manager,
          f.salary_head, f.ads, f.transport, f.penalties, f.tax
        FROM financial_rows f
        JOIN projects p ON p.id = f.project_id
        WHERE f.period_id = ${periodId}
      `;
    } else {
      rows = await sql_conn`
        SELECT p.name AS project, f.revenue_no_vat, f.salary_workers, f.salary_manager,
          f.salary_head, f.ads, f.transport, f.penalties, f.tax
        FROM financial_rows f
        JOIN projects p ON p.id = f.project_id
        WHERE f.period_id = ${periodId} AND f.project_id = ANY(${projectIds})
      `;
    }

    const projects = rows.map((r) => {
      const revenue = num(r.revenue_no_vat);
      const salary_workers = num(r.salary_workers);
      const salary_manager = num(r.salary_manager);
      const salary_head = num(r.salary_head);
      const ads = num(r.ads);
      const transport = num(r.transport);
      const penalties = num(r.penalties);
      const tax = num(r.tax);
      const costs = salary_workers + salary_manager + salary_head + ads + transport + penalties + tax;
      const profit = revenue - costs;
      const margin = revenue > 0 ? profit / revenue : 0;

      return {
        project: r.project,
        revenue: round2(revenue),
        costs: round2(costs),
        profit: round2(profit),
        margin: Math.round(margin * 10000) / 10000,
        salary_workers: round2(salary_workers),
        salary_manager: round2(salary_manager),
        salary_head: round2(salary_head),
        ads: round2(ads),
        transport: round2(transport),
        penalties: round2(penalties),
        tax: round2(tax),
      };
    });

    const top_profitable = [...projects].sort((a, b) => b.profit - a.profit).slice(0, 3);
    const top_unprofitable = [...projects].sort((a, b) => a.profit - b.profit).slice(0, 3);

    const anomalies = projects
      .map((p) => {
        const items = [];
        if (p.penalties > 0) items.push({ type: "Штрафы", value: p.penalties });
        if (p.revenue > 0 && p.ads / p.revenue > 0.05 && p.ads > 50000) items.push({ type: "Высокие расходы на рекламу", value: p.ads });
        if (p.margin < 0.1 && p.revenue > 100000) items.push({ type: "Низкая маржинальность", value: p.margin });
        return items.length > 0 ? { project: p.project, anomalies: items } : null;
      })
      .filter(Boolean)
      .flatMap((item) =>
        item.anomalies.map((a) => ({
          project: item.project,
          reason: a.type,
          value: a.value,
        }))
      );

    const totals = projects.reduce(
      (acc, p) => {
        acc.revenue += p.revenue;
        acc.costs += p.costs;
        acc.profit += p.profit;
        acc.salary_workers += p.salary_workers;
        acc.salary_manager += p.salary_manager;
        acc.salary_head += p.salary_head;
        acc.ads += p.ads;
        acc.transport += p.transport;
        acc.penalties += p.penalties;
        acc.tax += p.tax;
        return acc;
      },
      { revenue: 0, costs: 0, profit: 0, salary_workers: 0, salary_manager: 0, salary_head: 0, ads: 0, transport: 0, penalties: 0, tax: 0 }
    );
    totals.margin = totals.revenue > 0 ? totals.profit / totals.revenue : 0;

    const riskDistribution = { green: 0, yellow: 0, red: 0 };
    projects.forEach((p) => {
      if (p.revenue > 0 && p.margin < 0.1) riskDistribution.red++;
      else if (p.revenue > 0 && p.margin < 0.2) riskDistribution.yellow++;
      else riskDistribution.green++;
    });

    const insights = [];
    const bestMargin = [...projects].filter(p => p.revenue > 0).sort((a, b) => b.margin - a.margin)[0];
    if (bestMargin) insights.push({ icon: "🏆", text: `Самая высокая маржа — ${bestMargin.project} (${(bestMargin.margin * 100).toFixed(1)}%)` });

    const worstMargin = [...projects].filter(p => p.revenue > 0).sort((a, b) => a.margin - b.margin)[0];
    if (worstMargin) insights.push({ icon: "📉", text: `Самая низкая маржа — ${worstMargin.project} (${(worstMargin.margin * 100).toFixed(1)}%)` });

    const topAds = [...projects].sort((a, b) => b.ads - a.ads)[0];
    if (topAds && topAds.ads > 0) insights.push({ icon: "📢", text: `Больше всего на рекламу — ${topAds.project} (${round2(topAds.ads).toLocaleString('ru-RU')} ₽)` });

    const topPenalties = [...projects].sort((a, b) => b.penalties - a.penalties)[0];
    if (topPenalties && topPenalties.penalties > 0) insights.push({ icon: "⚖️", text: `Максимум штрафов — ${topPenalties.project} (${round2(topPenalties.penalties).toLocaleString('ru-RU')} ₽)` });

    if (totals.penalties > 0) insights.push({ icon: "⚠️", text: `Общая сумма штрафов за период — ${round2(totals.penalties).toLocaleString('ru-RU')} ₽` });

    const profitableCount = projects.filter(p => p.profit > 0).length;
    insights.push({ icon: "✅", text: `${profitableCount} из ${projects.length} проектов прибыльны` });

    res.status(200).json({
      ok: true,
      month,
      top_profitable,
      top_unprofitable,
      anomalies,
      totals,
      projects,
      riskDistribution,
      insights,
    });
  } catch (error) {
    console.error("Summary API error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}
