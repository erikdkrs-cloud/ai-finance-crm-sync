import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    var body = req.body || {};
    var project = String(body.project || "").trim();
    var month = String(body.month || "").trim();

    if (!project) return res.status(400).json({ ok: false, error: "project is required" });
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ ok: false, error: "month must be YYYY-MM" });

    var sql = neon(process.env.DATABASE_URL);

    var periodRows = await sql`SELECT id FROM periods WHERE month = ${month} LIMIT 1`;
    if (!periodRows || !periodRows[0]) {
      return res.status(404).json({ ok: false, error: "Period not found: " + month });
    }
    var period_id = Number(periodRows[0].id);

    var projectRows = await sql`SELECT id FROM projects WHERE name = ${project} LIMIT 1`;
    if (!projectRows || !projectRows[0]) {
      return res.status(404).json({ ok: false, error: "Project not found: " + project });
    }
    var project_id = Number(projectRows[0].id);

    var fields = {};
    var allowed = [
      "revenue_no_vat", "salary_workers", "salary_manager",
      "salary_head", "ads", "transport", "penalties", "tax"
    ];

    var fieldMap = {
      revenue: "revenue_no_vat",
      salary_workers: "salary_workers",
      salary_manager: "salary_manager",
      salary_head: "salary_head",
      ads: "ads",
      transport: "transport",
      penalties: "penalties",
      tax: "tax",
    };

    Object.keys(body).forEach(function (key) {
      var dbField = fieldMap[key];
      if (dbField && allowed.indexOf(dbField) !== -1) {
        fields[dbField] = Number(body[key]) || 0;
      }
    });

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ ok: false, error: "No valid fields to update" });
    }

    var revenue_no_vat = fields.revenue_no_vat;
    var salary_workers = fields.salary_workers;
    var salary_manager = fields.salary_manager;
    var salary_head = fields.salary_head;
    var ads = fields.ads;
    var transport = fields.transport;
    var penalties = fields.penalties;
    var tax = fields.tax;

    if (revenue_no_vat !== undefined) {
      await sql`UPDATE financial_rows SET revenue_no_vat = ${revenue_no_vat} WHERE project_id = ${project_id} AND period_id = ${period_id}`;
    }
    if (salary_workers !== undefined) {
      await sql`UPDATE financial_rows SET salary_workers = ${salary_workers} WHERE project_id = ${project_id} AND period_id = ${period_id}`;
    }
    if (salary_manager !== undefined) {
      await sql`UPDATE financial_rows SET salary_manager = ${salary_manager} WHERE project_id = ${project_id} AND period_id = ${period_id}`;
    }
    if (salary_head !== undefined) {
      await sql`UPDATE financial_rows SET salary_head = ${salary_head} WHERE project_id = ${project_id} AND period_id = ${period_id}`;
    }
    if (ads !== undefined) {
      await sql`UPDATE financial_rows SET ads = ${ads} WHERE project_id = ${project_id} AND period_id = ${period_id}`;
    }
    if (transport !== undefined) {
      await sql`UPDATE financial_rows SET transport = ${transport} WHERE project_id = ${project_id} AND period_id = ${period_id}`;
    }
    if (penalties !== undefined) {
      await sql`UPDATE financial_rows SET penalties = ${penalties} WHERE project_id = ${project_id} AND period_id = ${period_id}`;
    }
    if (tax !== undefined) {
      await sql`UPDATE financial_rows SET tax = ${tax} WHERE project_id = ${project_id} AND period_id = ${period_id}`;
    }

    return res.status(200).json({ ok: true, updated: Object.keys(fields) });
  } catch (e) {
    console.error("Update error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
