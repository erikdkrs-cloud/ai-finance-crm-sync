import { neon } from "@neondatabase/serverless";
import { verifySessionToken, getCookie } from "./auth";

var sql = neon(process.env.DATABASE_URL);

export async function getUserProjectIds(req) {
  try {
    // Read JWT directly from cookie
    var token = getCookie(req, "ai_finance_session");
    if (!token) return [];

    var payload = await verifySessionToken(token);
    var role = payload.role || "viewer";
    var userId = payload.userId;

    // Admin sees everything
    if (role === "admin") return null;

    // No userId in token = no access
    if (!userId) return [];

    var rows = await sql`
      SELECT project_id FROM user_projects WHERE user_id = ${parseInt(userId)}
    `;

    return rows.map(function (r) { return r.project_id; });
  } catch (e) {
    console.error("getUserProjectIds error:", e);
    return [];
  }
}
