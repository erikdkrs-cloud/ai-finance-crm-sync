import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { createSessionToken, setCookie } from "../../../lib/auth";

var sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    var body = req.body || {};
    var email = (body.email || "").toLowerCase().trim();
    var password = body.password || "";
    var name = (body.name || "").trim();

    if (!email || !password || !name) {
      return res.status(400).json({ ok: false, error: "Email, пароль и имя обязательны" });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: "Пароль минимум 6 символов" });
    }

    // Check if email exists
    var existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, error: "Пользователь с таким email уже существует" });
    }

    // First user = admin
    var userCount = await sql`SELECT COUNT(*) as cnt FROM users`;
    var isFirst = parseInt(userCount[0].cnt) === 0;
    var role = isFirst ? "admin" : "viewer";

    // Hash password
    var salt = await bcrypt.genSalt(10);
    var hash = await bcrypt.hash(password, salt);

    // Insert
    var inserted = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${email}, ${hash}, ${name}, ${role})
      RETURNING id, email, name, role
    `;

    var user = inserted[0];

    // Create JWT token
    var token = await createSessionToken({
      login: user.email,
      role: user.role,
      userId: user.id,
      name: user.name,
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
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: isFirst ? "Вы зарегистрированы как администратор!" : "Регистрация успешна!",
    });
  } catch (e) {
    console.error("Register error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
