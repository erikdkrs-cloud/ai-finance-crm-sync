import { neon } from "@neondatabase/serverless";

function num(x){ return Number(x || 0); }

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, method: req.method });

  const sql = neon(process.env.DATABASE_URL);
  const month = String(req.query?.month || "").trim();

  if (!month) return res.status(400).json({ ok: false, error: "month query param required (YYYY-MM)" });

  try {
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

    const projects = rows.map(r => {
      const revenue = num(r.revenue_no_vat);
      const costs =
        num(r.salary_workers) + num(r.salary_manager) + num(r.salary_head) +
        num(r.ads) + num(r.transport) + num(r.penalties) + num(r.tax);

      const profit = revenue - costs;
      const margin = revenue > 0 ? profit / revenue : 0;

      let risk = "green";
      if (revenue > 0 && margin < 0.1) risk = "red";
      else if (revenue > 0 && margin < 0.2) risk = "yellow";
      if (num(r.penalties) > 0 && risk === "green") risk = "yellow";

      return {
        project: r.project,
        revenue,
        profit,
        margin,
        risk,
        penalties: num(r.penalties),
        ads: num(r.ads),
        labor: num(r.salary_workers)
      };
    });

    const totals = projects.reduce((a, p) => {
      a.revenue += p.revenue;
      a.profit += p.profit;
      return a;
    }, { revenue: 0, profit: 0 });

    totals.margin = totals.revenue > 0 ? totals.profit / totals.revenue : 0;

    return res.status(200).json({ ok: true, month, totals, projects });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
