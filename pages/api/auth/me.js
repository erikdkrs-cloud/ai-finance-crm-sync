import { getCookie, verifySessionToken } from "../../../lib/auth";
import { neon } from "@neondatabase/serverless";

var sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    var token = getCookie(req, "ai_finance_session");
    if (!token) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    var payload = await verifySessionToken(token);
    var login = payload.login || "";
    var role = payload.role || "viewer";
    var userId = payload.userId || null;
    var name = payload.name || login;

    // If DB user, get fresh data
    if (userId) {
      try {
        var dbUser = await sql`
          SELECT id, email, name, role, is_active FROM users WHERE id = ${userId} LIMIT 1
        `;
        if (dbUser.length > 0 && dbUser[0].is_active) {
          return res.status(200).json({
            ok: true,
            user: {
              id: dbUser[0].id,
              email: dbUser[0].email,
              name: dbUser[0].name,
              role: dbUser[0].role,
              source: "db",
            },
          });
        }
      } catch (e) {
        // fall through
      }
    }

    // ENV user or fallback
    return res.status(200).json({
      ok: true,
      user: {
        id: null,
        email: login,
        name: name,
        role: role,
        source: "env",
      },
    });
  } catch (e) {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}
