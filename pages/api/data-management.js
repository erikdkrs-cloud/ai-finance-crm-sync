import { neon } from "@neondatabase/serverless";
import { verifySessionToken, getCookie } from "../../lib/auth";

var sql = neon(process.env.DATABASE_URL);

async function getUser(req) {
  try {
    var token = getCookie(req, "ai_finance_session");
    if (!token) return null;
    return await verifySessionToken(token);
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  var user = await getUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Admin only" });
  }

  var action = req.query.action || req.body?.action || "";

  // GET: list projects with row counts
  if (req.method === "GET" && action === "projects") {
    var projects = await sql`
      SELECT p.id, p.name,
        COUNT(f.id) as row_count,
        COALESCE(SUM(f.revenue_no_vat), 0) as total_revenue
      FROM projects p
      LEFT JOIN financial_rows f ON f.project_id = p.id
      GROUP BY p.id, p.name
      ORDER BY p.name
    `;
    return res.json({ ok: true, projects: projects });
  }

  // GET: list periods with row counts
  if (req.method === "GET" && action === "periods") {
    var periods = await sql`
      SELECT per.id, per.month,
        COUNT(f.id) as row_count,
        COALESCE(SUM(f.revenue_no_vat), 0) as total_revenue,
        COUNT(DISTINCT f.project_id) as project_count
      FROM periods per
      LEFT JOIN financial_rows f ON f.period_id = per.id
      GROUP BY per.id, per.month
      ORDER BY per.month DESC
    `;
    return res.json({ ok: true, periods: periods });
  }

  // POST: delete project
  if (req.method === "POST" && action === "delete-project") {
    var projectId = Number(req.body.project_id);
    if (!projectId) return res.status(400).json({ ok: false, error: "project_id required" });

    await sql`DELETE FROM financial_rows WHERE project_id = ${projectId}`;
    await sql`DELETE FROM user_projects WHERE project_id = ${projectId}`;
    await sql`DELETE FROM projects WHERE id = ${projectId}`;

    return res.json({ ok: true, deleted: "project", id: projectId });
  }

  // POST: delete period
  if (req.method === "POST" && action === "delete-period") {
    var periodId = Number(req.body.period_id);
    if (!periodId) return res.status(400).json({ ok: false, error: "period_id required" });

    await sql`DELETE FROM financial_rows WHERE period_id = ${periodId}`;
    await sql`DELETE FROM periods WHERE id = ${periodId}`;

    return res.json({ ok: true, deleted: "period", id: periodId });
  }

  // POST: cleanup empty projects (no financial rows)
  if (req.method === "POST" && action === "cleanup-projects") {
    var empty = await sql`
      SELECT p.id, p.name FROM projects p
      LEFT JOIN financial_rows f ON f.project_id = p.id
      GROUP BY p.id, p.name
      HAVING COUNT(f.id) = 0
    `;

    var ids = empty.map(function (r) { return r.id; });
    if (ids.length > 0) {
      await sql`DELETE FROM user_projects WHERE project_id = ANY(${ids})`;
      await sql`DELETE FROM projects WHERE id = ANY(${ids})`;
    }

    return res.json({ ok: true, deleted_count: ids.length, deleted_names: empty.map(function (r) { return r.name; }) });
  }

  // POST: cleanup empty periods
  if (req.method === "POST" && action === "cleanup-periods") {
    var emptyPeriods = await sql`
      SELECT per.id, per.month FROM periods per
      LEFT JOIN financial_rows f ON f.period_id = per.id
      GROUP BY per.id, per.month
      HAVING COUNT(f.id) = 0
    `;

    var pIds = emptyPeriods.map(function (r) { return r.id; });
    if (pIds.length > 0) {
      await sql`DELETE FROM periods WHERE id = ANY(${pIds})`;
    }

    return res.json({ ok: true, deleted_count: pIds.length, deleted_months: emptyPeriods.map(function (r) { return r.month; }) });
  }

  return res.status(400).json({ ok: false, error: "Unknown action" });
}
