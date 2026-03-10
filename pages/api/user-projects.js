import { neon } from "@neondatabase/serverless";
import { verifySessionToken, getCookie } from "../../lib/auth";

var sql = neon(process.env.DATABASE_URL);

async function getRole(req) {
  try {
    var token = getCookie(req, "ai_finance_session");
    if (!token) return "";
    var payload = await verifySessionToken(token);
    return payload.role || "";
  } catch (e) {
    return "";
  }
}

export default async function handler(req, res) {
  var role = await getRole(req);
  if (role !== "admin") {
    return res.status(403).json({ ok: false, error: "Admin only" });
  }

  if (req.method === "GET") {
    try {
      var userId = req.query.user_id;
      if (!userId) return res.status(400).json({ ok: false, error: "user_id required" });

      var assigned = await sql`
        SELECT p.id, p.name
        FROM user_projects up
        JOIN projects p ON p.id = up.project_id
        WHERE up.user_id = ${parseInt(userId)}
        ORDER BY p.name
      `;

      var allProjects = await sql`SELECT id, name FROM projects ORDER BY name`;

      return res.status(200).json({ ok: true, assigned: assigned, all_projects: allProjects });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      var body = req.body;
      var userId = body.user_id;
      var projectIds = body.project_ids || [];

      if (!userId) return res.status(400).json({ ok: false, error: "user_id required" });

      await sql`DELETE FROM user_projects WHERE user_id = ${parseInt(userId)}`;

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
