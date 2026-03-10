import { neon } from "@neondatabase/serverless";
import { getUserProjectIds } from "../../lib/getUserProjects";

var sql = neon(process.env.DATABASE_URL);

function num(x) { return Number(x || 0); }

export default async function handler(req, res) {
  var action = req.query.action || "projects";

  try {
    // Get user's allowed projects
    var projectIds = await getUserProjectIds(req);
    if (Array.isArray(projectIds) && projectIds.length === 0) {
      if (action === "projects") return res.status(200).json({ ok: true, projects: [] });
      if (action === "detail") return res.status(200).json({ ok: true, monthly: [], totals: null });
    }

    // List projects
    if (action === "projects") {
      var projects;
      if (projectIds === null) {
        projects = await sql`
          SELECT p.id, p.name, COUNT(f.id) as row_count
          FROM projects p
          LEFT JOIN financial_rows f ON f.project_id = p.id
          GROUP BY p.id, p.name
          ORDER BY p.name
        `;
      } else {
        projects = await sql`
          SELECT p.id, p.name, COUNT(f.id) as row_count
          FROM projects p
          LEFT JOIN financial_rows f ON f.project_id = p.id
          WHERE p.id = ANY(${projectIds})
          GROUP BY p.id, p.name
          ORDER BY p.name
        `;
      }
      return res.status(200).json({ ok: true, projects: projects });
    }

    // Project detail
    if (action === "detail") {
      var projectName = req.query.project;
      if (!projectName) return res.status(400).json({ ok: false, error: "project required" });

      // Check user has access to this project
      if (projectIds !== null) {
        var projectCheck = await sql`SELECT id FROM projects WHERE name = ${projectName} LIMIT 1`;
        if (projectCheck.length === 0 || projectIds.indexOf(projectCheck[0].id) === -1) {
          return res.status(403).json({ ok: false, error: "Нет доступа к этому проекту" });
        }
      }

      var rows = await sql`
        SELECT per.month,
          f.revenue_no_vat, f.salary_workers, f.salary_manager, f.salary_head,
          f.ads, f.transport, f.penalties, f.tax
        FROM financial_rows f
        JOIN projects p ON p.id = f.project_id
        JOIN periods per ON per.id = f.period_id
        WHERE p.name = ${projectName}
        ORDER BY per.month ASC
      `;

      if (rows.length === 0) {
        return res.status(200).json({ ok: true, monthly: [], totals: null });
      }

      var monthly = rows.map(function (r) {
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

        return {
          month: r.month,
          revenue: revenue,
          salary_workers: salary_workers,
          salary_manager: salary_manager,
          salary_head: salary_head,
          ads: ads,
          transport: transport,
          penalties: penalties,
          tax: tax,
          costs: costs,
          profit: profit,
          margin: margin,
        };
      });

      var totals = monthly.reduce(function (acc, r) {
        acc.revenue += r.revenue;
        acc.costs += r.costs;
        acc.profit += r.profit;
        acc.salary_workers += r.salary_workers;
        acc.salary_manager += r.salary_manager;
        acc.salary_head += r.salary_head;
        acc.ads += r.ads;
        acc.transport += r.transport;
        acc.penalties += r.penalties;
        acc.tax += r.tax;
        return acc;
      }, { revenue: 0, costs: 0, profit: 0, salary_workers: 0, salary_manager: 0, salary_head: 0, ads: 0, transport: 0, penalties: 0, tax: 0 });

      totals.margin = totals.revenue > 0 ? totals.profit / totals.revenue : 0;
      totals.months = monthly.length;

      return res.status(200).json({ ok: true, monthly: monthly, totals: totals });
    }

    return res.status(400).json({ ok: false, error: "Unknown action" });
  } catch (e) {
    console.error("Analytics API error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
