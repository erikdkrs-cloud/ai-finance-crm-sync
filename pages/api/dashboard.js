import { neon } from "@neondatabase/serverless";

function num(x) { return Number(x || 0); }
function round2(x){ return Math.round(num(x) * 100) / 100; }
function round4(x){ return Math.round(num(x) * 10000) / 10000; }

function computeRisk({ revenue, margin, penalties }) {
  let risk = "green";
  if (revenue > 0 && margin < 0.10) risk = "red";
  else if (revenue > 0 && margin < 0.20) risk = "yellow";
  if (num(penalties) > 0 && risk === "green") risk = "yellow";
  return risk;
}

export default async function handler(req, res) {
  try {
    const month = String(req.query?.month || "").trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ ok: false, error: `month must be YYYY-MM, got: "${month}"` });
    }

    const sql = neon(process.env.DATABASE_URL);

    // find period
    const periodRows = await sql`SELECT id, month FROM periods WHERE month = ${month} LIMIT 1`;
    const period = periodRows?.[0];
    if (!period?.id) {
      return res.status(404).json({ ok: false, error: `period not found for month=${month}` });
    }
    const period_id = Number(period.id);

    // get rows
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
      JOIN projects pr ON pr.id = fr.project_id
      WHERE fr.period_id = ${period_id}
      ORDER BY pr.name
    `;

    const projects = rows.map(r => {
      const revenue = num(r.revenue_no_vat);

      const salary_workers = num(r.salary_workers);
      const salary_manager = num(r.salary_manager);
      const salary_head = num(r.salary_head);

      const ads = num(r.ads);
      const transport = num(r.transport);
      const penalties = num(r.penalties);
      const tax = num(r.tax);

      const team_payroll = salary_manager + salary_head;

      const costs = salary_workers + team_payroll + ads + transport + penalties + tax;
      const profit = revenue - costs;
      const margin = revenue > 0 ? profit / revenue : 0;

      const risk = computeRisk({ revenue, margin, penalties });

      return {
        project: r.project,
        revenue: round2(revenue),
        costs: round2(costs),
        profit: round2(profit),
        margin: round4(margin),
        risk,

        penalties: round2(penalties),
        ads: round2(ads),

        // было: labor = зарплата рабочих (чтобы не ломать фронт)
        labor: round2(salary_workers),

        // НОВОЕ:
        transport: round2(transport),
        team_payroll: round2(team_payroll),
      };
    });

    const totalsAgg = projects.reduce((a, p) => {
      a.revenue += num(p.revenue);
      a.costs += num(p.costs);
      a.profit += num(p.profit);
      a.ads += num(p.ads);
      a.penalties += num(p.penalties);
      a.labor += num(p.labor);
      a.transport += num(p.transport);
      a.team_payroll += num(p.team_payroll);
      return a;
    }, { revenue:0, costs:0, profit:0, ads:0, penalties:0, labor:0, transport:0, team_payroll:0 });

    const totals = {
      revenue: round2(totalsAgg.revenue),
      costs: round2(totalsAgg.costs),
      profit: round2(totalsAgg.profit),
      margin: round4(totalsAgg.revenue > 0 ? totalsAgg.profit / totalsAgg.revenue : 0),

      // доп. поля (не обязательно, но полезно)
      ads: round2(totalsAgg.ads),
      penalties: round2(totalsAgg.penalties),
      labor: round2(totalsAgg.labor),
      transport: round2(totalsAgg.transport),
      team_payroll: round2(totalsAgg.team_payroll),
    };

    return res.status(200).json({ ok: true, month, totals, projects });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
