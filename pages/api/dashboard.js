import { neon } from "@neondatabase/serverless";
import { getUserProjectIds } from "../../lib/getUserProjects";

function num(x) { return Number(x || 0); }
function round2(x) { return Math.round(num(x) * 100) / 100; }
function round4(x) { return Math.round(num(x) * 10000) / 10000; }

function computeRisk(o) {
  var revenue = o.revenue, margin = o.margin, penalties = o.penalties;
  var risk = "green";
  if (revenue > 0 && margin < 0.10) risk = "red";
  else if (revenue > 0 && margin < 0.20) risk = "yellow";
  if (num(penalties) > 0 && risk === "green") risk = "yellow";
  return risk;
}

export default async function handler(req, res) {
  try {
    var month = String((req.query && req.query.month) || "").trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ ok: false, error: "month must be YYYY-MM, got: \"" + month + "\"" });
    }

    var sql = neon(process.env.DATABASE_URL);

    var projectIds = await getUserProjectIds(req);
    if (Array.isArray(projectIds) && projectIds.length === 0) {
      return res.status(200).json({ ok: true, month: month, totals: { revenue: 0, costs: 0, profit: 0, margin: 0 }, projects: [] });
    }

    var periodRows = await sql`SELECT id, month FROM periods WHERE month = ${month} LIMIT 1`;
    var period = periodRows && periodRows[0];
    if (!period || !period.id) {
      return res.status(404).json({ ok: false, error: "period not found for month=" + month });
    }
    var period_id = Number(period.id);

    var rows;
    if (projectIds === null) {
      rows = await sql`
        SELECT pr.name AS project, fr.revenue_no_vat, fr.salary_workers, fr.salary_manager,
          fr.salary_head, fr.ads, fr.transport, fr.penalties, fr.tax
        FROM financial_rows fr
        JOIN projects pr ON pr.id = fr.project_id
        WHERE fr.period_id = ${period_id}
        ORDER BY pr.name
      `;
    } else {
      rows = await sql`
        SELECT pr.name AS project, fr.revenue_no_vat, fr.salary_workers, fr.salary_manager,
          fr.salary_head, fr.ads, fr.transport, fr.penalties, fr.tax
        FROM financial_rows fr
        JOIN projects pr ON pr.id = fr.project_id
        WHERE fr.period_id = ${period_id} AND fr.project_id = ANY(${projectIds})
        ORDER BY pr.name
      `;
    }

    var projects = rows.map(function (r) {
      var revenue = num(r.revenue_no_vat);
      var salary_workers = num(r.salary_workers);
      var salary_manager = num(r.salary_manager);
      var salary_head = num(r.salary_head);
      var ads = num(r.ads);
      var transport = num(r.transport);
      var penalties = num(r.penalties);
      var tax = num(r.tax);
      var costs = salary_workers + salary_manager + salary_head + ads + transport + penalties + tax;
      var profit = revenue - costs;
      var margin = revenue > 0 ? profit / revenue : 0;
      var risk = computeRisk({ revenue: revenue, margin: margin, penalties: penalties });

      return {
        project: r.project,
        revenue: round2(revenue),
        costs: round2(costs),
        profit: round2(profit),
        margin: round4(margin),
        risk: risk,
        salary_workers: round2(salary_workers),
        salary_manager: round2(salary_manager),
        salary_head: round2(salary_head),
        ads: round2(ads),
        transport: round2(transport),
        penalties: round2(penalties),
        tax: round2(tax),
      };
    });

    var totalsAgg = projects.reduce(function (a, p) {
      a.revenue += num(p.revenue);
      a.costs += num(p.costs);
      a.profit += num(p.profit);
      a.salary_workers += num(p.salary_workers);
      a.salary_manager += num(p.salary_manager);
      a.salary_head += num(p.salary_head);
      a.ads += num(p.ads);
      a.transport += num(p.transport);
      a.penalties += num(p.penalties);
      a.tax += num(p.tax);
      return a;
    }, { revenue: 0, costs: 0, profit: 0, salary_workers: 0, salary_manager: 0, salary_head: 0, ads: 0, transport: 0, penalties: 0, tax: 0 });

    var totals = {
      revenue: round2(totalsAgg.revenue),
      costs: round2(totalsAgg.costs),
      profit: round2(totalsAgg.profit),
      margin: round4(totalsAgg.revenue > 0 ? totalsAgg.profit / totalsAgg.revenue : 0),
      salary_workers: round2(totalsAgg.salary_workers),
      salary_manager: round2(totalsAgg.salary_manager),
      salary_head: round2(totalsAgg.salary_head),
      ads: round2(totalsAgg.ads),
      transport: round2(totalsAgg.transport),
      penalties: round2(totalsAgg.penalties),
      tax: round2(totalsAgg.tax),
    };

    return res.status(200).json({ ok: true, month: month, totals: totals, projects: projects });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
