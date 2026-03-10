import { neon } from "@neondatabase/serverless";

var sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  var role = req.headers["x-user-role"] || "";
  if (role !== "admin") {
    return res.status(403).json({ ok: false, error: "Admin only" });
  }

  // GET — get projects assigned to a user
  if (req.method === "GET") {
    try {
      var userId = req.query.user_id;
      if (!userId) {
        return res.status(400).json({ ok: false, error: "user_id required" });
      }

      var assigned = await sql`
        SELECT p.id, p.name
        FROM user_projects up
        JOIN projects p ON p.id = up.project_id
        WHERE up.user_id = ${parseInt(userId)}
        ORDER BY p.name
      `;

      var allProjects = await sql`SELECT id, name FROM projects ORDER BY name`;

      return res.status(200).json({
        ok: true,
        assigned: assigned,
        all_projects: allProjects,
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // POST — set projects for a user (replace all)
  if (req.method === "POST") {
    try {
      var body = req.body;
      var userId = body.user_id;
      var projectIds = body.project_ids || [];

      if (!userId) {
        return res.status(400).json({ ok: false, error: "user_id required" });
      }

      // Delete all current assignments
      await sql`DELETE FROM user_projects WHERE user_id = ${parseInt(userId)}`;

      // Insert new assignments
      for (var i = 0; i < projectIds.length; i++) {
        await sql`
          INSERT INTO user_projects (user_id, project_id)
          VALUES (${parseInt(userId)}, ${parseInt(projectIds[i])})
          ON CONFLICT (user_id, project_id) DO NOTHING
        `;
      }

      return res.status(200).json({ ok: true, count: projectIds.length });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
