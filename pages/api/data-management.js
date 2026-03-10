import { neon } from "@neondatabase/serverless";

var sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {

  // GET — список записей с фильтрами
  if (req.method === "GET") {
    try {
      var month = req.query.month || "";
      var project = req.query.project || "";

      // Get all periods and projects for filters
      var allPeriods = await sql`SELECT DISTINCT month FROM periods ORDER BY month DESC`;
      var allProjects = await sql`SELECT DISTINCT name FROM projects ORDER BY name`;

      var query;
      if (month && project) {
        query = await sql`
          SELECT f.id, p.name AS project_name, per.month,
            f.revenue_no_vat, f.salary_workers, f.salary_manager, f.salary_head,
            f.ads, f.transport, f.penalties, f.tax
          FROM financial_rows f
          JOIN projects p ON p.id = f.project_id
          JOIN periods per ON per.id = f.period_id
          WHERE per.month = ${month} AND p.name = ${project}
          ORDER BY per.month DESC, p.name
        `;
      } else if (month) {
        query = await sql`
          SELECT f.id, p.name AS project_name, per.month,
            f.revenue_no_vat, f.salary_workers, f.salary_manager, f.salary_head,
            f.ads, f.transport, f.penalties, f.tax
          FROM financial_rows f
          JOIN projects p ON p.id = f.project_id
          JOIN periods per ON per.id = f.period_id
          WHERE per.month = ${month}
          ORDER BY per.month DESC, p.name
        `;
      } else if (project) {
        query = await sql`
          SELECT f.id, p.name AS project_name, per.month,
            f.revenue_no_vat, f.salary_workers, f.salary_manager, f.salary_head,
            f.ads, f.transport, f.penalties, f.tax
          FROM financial_rows f
          JOIN projects p ON p.id = f.project_id
          JOIN periods per ON per.id = f.period_id
          WHERE p.name = ${project}
          ORDER BY per.month DESC, p.name
        `;
      } else {
        query = await sql`
          SELECT f.id, p.name AS project_name, per.month,
            f.revenue_no_vat, f.salary_workers, f.salary_manager, f.salary_head,
            f.ads, f.transport, f.penalties, f.tax
          FROM financial_rows f
          JOIN projects p ON p.id = f.project_id
          JOIN periods per ON per.id = f.period_id
          ORDER BY per.month DESC, p.name
          LIMIT 200
        `;
      }

      return res.status(200).json({
        ok: true,
        rows: query,
        periods: allPeriods.map(function (r) { return r.month; }),
        projects: allProjects.map(function (r) { return r.name; }),
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // PUT — обновить запись
  if (req.method === "PUT") {
    try {
      var id = req.body.id;
      var v = req.body.values;
      if (!id || !v) return res.status(400).json({ ok: false, error: "id и values обязательны" });

      await sql`
        UPDATE financial_rows SET
          revenue_no_vat = ${parseFloat(v.revenue_no_vat) || 0},
          salary_workers = ${parseFloat(v.salary_workers) || 0},
          salary_manager = ${parseFloat(v.salary_manager) || 0},
          salary_head = ${parseFloat(v.salary_head) || 0},
          ads = ${parseFloat(v.ads) || 0},
          transport = ${parseFloat(v.transport) || 0},
          penalties = ${parseFloat(v.penalties) || 0},
          tax = ${parseFloat(v.tax) || 0}
        WHERE id = ${id}
      `;

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // POST — добавить новую запись
  if (req.method === "POST") {
    try {
      var r = req.body;
      if (!r.project || !r.month) return res.status(400).json({ ok: false, error: "project и month обязательны" });

      var projectName = String(r.project).trim();
      var month = String(r.month).trim();

      // Find or create project
      var existingProject = await sql`SELECT id FROM projects WHERE name = ${projectName} LIMIT 1`;
      var projectId;
      if (existingProject.length > 0) {
        projectId = existingProject[0].id;
      } else {
        var ins = await sql`INSERT INTO projects (name) VALUES (${projectName}) RETURNING id`;
        projectId = ins[0].id;
      }

      // Find or create period
      var existingPeriod = await sql`SELECT id FROM periods WHERE month = ${month} LIMIT 1`;
      var periodId;
      if (existingPeriod.length > 0) {
        periodId = existingPeriod[0].id;
      } else {
        var insP = await sql`INSERT INTO periods (month) VALUES (${month}) RETURNING id`;
        periodId = insP[0].id;
      }

      // Check duplicate
      var dup = await sql`
        SELECT id FROM financial_rows WHERE project_id = ${projectId} AND period_id = ${periodId} LIMIT 1
      `;
      if (dup.length > 0) {
        return res.status(400).json({ ok: false, error: "Запись для этого проекта и периода уже существует. Используйте редактирование." });
      }

      await sql`
        INSERT INTO financial_rows (
          project_id, period_id, revenue_no_vat,
          salary_workers, salary_manager, salary_head,
          ads, transport, penalties, tax
        ) VALUES (
          ${projectId}, ${periodId}, ${parseFloat(r.revenue_no_vat) || 0},
          ${parseFloat(r.salary_workers) || 0}, ${parseFloat(r.salary_manager) || 0}, ${parseFloat(r.salary_head) || 0},
          ${parseFloat(r.ads) || 0}, ${parseFloat(r.transport) || 0}, ${parseFloat(r.penalties) || 0}, ${parseFloat(r.tax) || 0}
        )
      `;

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // DELETE — удалить запись
  if (req.method === "DELETE") {
    try {
      var id = req.body.id;
      if (!id) return res.status(400).json({ ok: false, error: "id обязателен" });

      await sql`DELETE FROM financial_rows WHERE id = ${id}`;

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
