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

      var projectName = String(r.project).trim();
      var month = String(r.month).trim();
      var revenue = parseFloat(r.revenue) || 0;
      var salaryWorkers = parseFloat(r.expense_salary_workers) || 0;
      var salaryManager = parseFloat(r.expense_salary_management) || 0;
      var ads = parseFloat(r.expense_ads) || 0;
      var transport = parseFloat(r.expense_transport) || 0;
      var other = parseFloat(r.expense_other) || 0;
      var fines = parseFloat(r.expense_fines) || 0;
      var tax = parseFloat(r.expense_tax) || 0;
      var rent = parseFloat(r.expense_rent) || 0;

      // Find or create project
      var existingProject = await sql`
        SELECT id FROM projects WHERE name = ${projectName} LIMIT 1
      `;

      var projectId;
      if (existingProject.length > 0) {
        projectId = existingProject[0].id;
      } else {
        var insertedProject = await sql`
          INSERT INTO projects (name) VALUES (${projectName}) RETURNING id
        `;
        projectId = insertedProject[0].id;
      }

      // Find or create period
      var existingPeriod = await sql`
        SELECT id FROM periods WHERE month = ${month} LIMIT 1
      `;

      var periodId;
      if (existingPeriod.length > 0) {
        periodId = existingPeriod[0].id;
      } else {
        var insertedPeriod = await sql`
          INSERT INTO periods (month) VALUES (${month}) RETURNING id
        `;
        periodId = insertedPeriod[0].id;
      }

      // Check if financial_row already exists
      var existingRow = await sql`
        SELECT id FROM financial_rows
        WHERE project_id = ${projectId} AND period_id = ${periodId}
        LIMIT 1
      `;

      if (existingRow.length > 0) {
        // Update existing
        await sql`
          UPDATE financial_rows SET
            revenue_no_vat = ${revenue},
            salary_workers = ${salaryWorkers},
            salary_manager = ${salaryManager},
            salary_head = 0,
            ads = ${ads},
            transport = ${transport},
            penalties = ${fines},
            tax = ${tax}
          WHERE id = ${existingRow[0].id}
        `;
      } else {
        // Insert new
        await sql`
          INSERT INTO financial_rows (
            project_id, period_id, revenue_no_vat,
            salary_workers, salary_manager, salary_head,
            ads, transport, penalties, tax
          ) VALUES (
            ${projectId}, ${periodId}, ${revenue},
            ${salaryWorkers}, ${salaryManager}, 0,
            ${ads}, ${transport}, ${fines}, ${tax}
          )
        `;
      }

      projectsSet[projectName] = true;
      periodsSet[month] = true;
      imported++;
    }

    return res.status(200).json({
      ok: true,
      imported: imported,
      projects: Object.keys(projectsSet),
      periods: Object.keys(periodsSet),
    });
  } catch (e) {
    console.error("Import error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
