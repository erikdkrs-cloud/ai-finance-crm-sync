import { neon } from "@neondatabase/serverless";

var sql = neon(process.env.DATABASE_URL);

export async function getUserProjectIds(req) {
  var role = req.headers["x-user-role"] || "viewer";
  var userId = req.headers["x-user-id"] || "";

  // Admin sees everything
  if (role === "admin") return null; // null = no filter

  if (!userId) return []; // no access

  try {
    var rows = await sql`
      SELECT project_id FROM user_projects WHERE user_id = ${parseInt(userId)}
    `;
    return rows.map(function (r) { return r.project_id; });
  } catch (e) {
    console.error("getUserProjectIds error:", e);
    return [];
  }
}

export function buildProjectFilter(projectIds) {
  // null = admin, show all
  if (projectIds === null) return null;
  // empty array = no projects
  if (projectIds.length === 0) return [];
  return projectIds;
}
