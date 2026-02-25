import { neon } from "@neondatabase/serverless";

function num(x) {
  return Number(x || 0);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, method: req.method });
  }

  const sql = neon(process.env.DATABASE_URL);

  const month = String(req.query?.month || "").trim();
  if (!month) {
    return res.status(400).json({ ok: false, error: "month query param required (YYYY-MM)" });
  }

  try {
    // Берём строки расходов/выручки по проектам за выбранный месяц
    const rows = await sql`
      SELECT
        pr.name AS project,
        fr.revenue_no_vat,
        fr.salary_workers,
        fr.salary_manager,
        fr.salary_head,
        fr.ads,
        fr.transport,
        fr.penalties,
        fr.tax
      FROM financial_rows fr
      JOIN periods p ON p.id = fr.period_id
      JOIN projects pr ON pr.id = fr.project_id
      WHERE p.month = ${month}
      ORDER BY pr.name
    `;

    // Рассчитываем метрики на стороне API (чтобы фронт был простой)
    const projects = rows.map((r) => {
      const revenue = num(r.revenue_no_vat);

      const salaryWorkers = num(r.salary_workers);
      const salaryManager = num(r.salary_manager);
      const salaryHead = num(r.salary_head);

      const ads = num(r.ads);
      const transport = num(r.transport);
      const penalties = num(r.penalties);
      const tax = num(r.tax);

      const costs =
        salaryWorkers +
        salaryManager +
        salaryHead +
        ads +
        transport +
        penalties +
        tax;

      const profit = revenue - costs;
      const margin = revenue > 0 ? profit / revenue : 0;

      // правила риска (MVP)
      let risk = "green";
      if (revenue > 0 && margin < 0.1) risk = "red";
      else if (revenue > 0 && margin < 0.2) risk = "yellow";

      // пример доп. правила: штрафы → минимум yellow
      if (penalties > 0 && risk === "green") risk = "yellow";

      return {
        project: r.project,
        revenue,
        profit,
        margin,
        risk,
        penalties,
        ads,
        labor: salaryWorkers,
      };
    });

    // Итоги по всем проектам
    const totals = projects.reduce(
      (a, p) => {
        a.revenue += num(p.revenue);
        a.profit += num(p.profit);
        return a;
      },
      { revenue: 0, profit: 0 }
    );

    totals.margin = totals.revenue > 0 ? totals.profit / totals.revenue : 0;

    return res.status(200).json({
      ok: true,
      month,
      totals,
      projects,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
