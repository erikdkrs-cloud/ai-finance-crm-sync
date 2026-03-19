import { neon } from "@neondatabase/serverless";

var sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  var role = req.headers["x-user-role"] || "";
  if (role !== "admin" && role !== "director") {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  if (req.method === "GET") {
    try {
      var projects = await sql`SELECT id, name FROM projects ORDER BY name`;
      return res.json({ ok: true, projects: projects });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === "PUT") {
    try {
      var body = req.body;
      var vacancyId = body.vacancy_id;
      var projectId = body.project_id;
      if (!vacancyId) return res.status(400).json({ ok: false, error: "vacancy_id required" });

      await sql`UPDATE avito_vacancies SET project_id = ${projectId || null} WHERE id = ${parseInt(vacancyId)}`;
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      var body = req.body;
      var assignments = body.assignments;
      if (!assignments || !Array.isArray(assignments)) {
        return res.status(400).json({ ok: false, error: "assignments array required" });
      }
      for (var i = 0; i < assignments.length; i++) {
        var a = assignments[i];
        await sql`UPDATE avito_vacancies SET project_id = ${a.project_id || null} WHERE id = ${parseInt(a.vacancy_id)}`;
      }
      return res.json({ ok: true, count: assignments.length });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
