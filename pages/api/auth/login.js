import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { createSessionToken, parseUsersEnv, setCookie } from "../../../lib/auth";

var sql = neon(process.env.DATABASE_URL);

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  var res = 0;
  for (var i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  var body = req.body || {};
  var login = body.login || body.email || "";
  var password = body.password || "";

  if (!login || !password) {
    return res.status(400).json({ ok: false, error: "Логин и пароль обязательны" });
  }

  // === 1. Try DB users first ===
  try {
    var dbUsers = await sql`
      SELECT id, email, password_hash, name, role, is_active
      FROM users
      WHERE email = ${login.toLowerCase().trim()}
      LIMIT 1
    `;

    if (dbUsers.length > 0) {
      var dbUser = dbUsers[0];

      if (!dbUser.is_active) {
        return res.status(403).json({ ok: false, error: "Аккаунт деактивирован" });
      }

      var valid = await bcrypt.compare(password, dbUser.password_hash);
      if (valid) {
        var token = await createSessionToken({
          login: dbUser.email,
          role: dbUser.role,
          userId: dbUser.id,
          name: dbUser.name,
        });

        setCookie(res, "ai_finance_session", token, {
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        return res.status(200).json({
          ok: true,
          login: dbUser.email,
          role: dbUser.role,
          name: dbUser.name,
          userId: dbUser.id,
          source: "db",
        });
      }
    }
  } catch (e) {
    console.error("DB auth error:", e);
    // Fall through to ENV auth
  }

  // === 2. Fallback: ENV users (AUTH_USERS) ===
  var envUsers = parseUsersEnv();
  var envUser = envUsers.find(function (u) { return String(u.login) === String(login); });

  if (envUser && safeEqual(String(envUser.password || ""), String(password))) {
    var role = String(envUser.role || "viewer");
    var token = await createSessionToken({ login: String(login), role: role });

    setCookie(res, "ai_finance_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res.status(200).json({ ok: true, login: String(login), role: role, source: "env" });
  }

  return res.status(401).json({ ok: false, error: "Неверный логин или пароль" });
}
