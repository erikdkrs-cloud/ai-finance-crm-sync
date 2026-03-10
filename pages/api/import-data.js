import { neon } from "@neondatabase/serverless";

var sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    var rows = req.body.rows;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ ok: false, error: "Нет данных для импорта" });
    }

    var imported = 0;
    var projectsSet = {};
    var periodsSet = {};

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r.project || !r.month) continue;

      var project = String(r.project).trim();
      var month = String(r.month).trim();
      var revenue = parseFloat(r.revenue) || 0;
      var salary = parseFloat(r.expense_salary) || 0;
      var ads = parseFloat(r.expense_ads) || 0;
      var transport = parseFloat(r.expense_transport) || 0;
      var other = parseFloat(r.expense_other) || 0;
      var fines = parseFloat(r.expense_fines) || 0;
      var tax = parseFloat(r.expense_tax) || 0;
      var rent = parseFloat(r.expense_rent) || 0;

      // Check if project exists
      var existing = await sql`
        SELECT id FROM projects WHERE name = ${project} LIMIT 1
      `;

      var projectId;
      if (existing.length > 0) {
        projectId = existing[0].id;
      } else {
        var inserted = await sql`
          INSERT INTO projects (name) VALUES (${project}) RETURNING id
        `;
        projectId = inserted[0].id;
      }

      // Upsert financial data
      var existingData = await sql`
        SELECT id FROM project_data 
        WHERE project_id = ${projectId} AND month = ${month} LIMIT 1
      `;

      if (existingData.length > 0) {
        await sql`
          UPDATE project_data SET
            revenue = ${revenue},
            expense_salary = ${salary},
            expense_ads = ${ads},
            expense_transport = ${transport},
            expense_other = ${other},
            expense_fines = ${fines},
            expense_tax = ${tax},
            expense_rent = ${rent},
            updated_at = NOW()
          WHERE id = ${existingData[0].id}
        `;
      } else {
        await sql`
          INSERT INTO project_data (project_id, month, revenue, expense_salary, expense_ads, expense_transport, expense_other, expense_fines, expense_tax, expense_rent)
          VALUES (${projectId}, ${month}, ${revenue}, ${salary}, ${ads}, ${transport}, ${other}, ${fines}, ${tax}, ${rent})
        `;
      }

      projectsSet[project] = true;
      periodsSet[month] = true;
      imported++;
    }

    // Refresh materialized view
    try {
      await sql`REFRESH MATERIALIZED VIEW v_financial_calc`;
    } catch (e) {
      // view might not exist yet, ignore
    }

    return res.status(200).json({
      ok: true,
      imported: imported,
      projects: Object.keys(projectsSet),
      periods: Object.keys(periodsSet),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
