import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

var sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // Check admin role from middleware header
  var role = req.headers["x-user-role"] || "";
  if (role !== "admin") {
    return res.status(403).json({ ok: false, error: "Admin only" });
  }

  // GET — list users
  if (req.method === "GET") {
    try {
      var users = await sql`
        SELECT id, email, name, role, is_active, created_at
        FROM users ORDER BY created_at DESC
      `;
      return res.status(200).json({ ok: true, users: users });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // POST — create user
  if (req.method === "POST") {
    try {
      var body = req.body;
      var email = (body.email || "").toLowerCase().trim();
      var password = body.password || "";
      var name = (body.name || "").trim();
      var userRole = body.role || "viewer";

      if (!email || !password || !name) {
        return res.status(400).json({ ok: false, error: "Email, пароль и имя обязательны" });
      }
      if (password.length < 6) {
        return res.status(400).json({ ok: false, error: "Пароль минимум 6 символов" });
      }

      var existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
      if (existing.length > 0) {
        return res.status(400).json({ ok: false, error: "Email уже занят" });
      }

      var salt = await bcrypt.genSalt(10);
      var hash = await bcrypt.hash(password, salt);

      var inserted = await sql`
        INSERT INTO users (email, password_hash, name, role)
        VALUES (${email}, ${hash}, ${name}, ${userRole})
        RETURNING id, email, name, role, is_active, created_at
      `;

      return res.status(200).json({ ok: true, user: inserted[0] });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // PUT — update user
  if (req.method === "PUT") {
    try {
      var body = req.body;
      var id = body.id;
      if (!id) return res.status(400).json({ ok: false, error: "id required" });

      var updates = [];
      if (body.name !== undefined) {
        await sql`UPDATE users SET name = ${body.name.trim()}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.role !== undefined) {
        await sql`UPDATE users SET role = ${body.role}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.is_active !== undefined) {
        await sql`UPDATE users SET is_active = ${body.is_active}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.password && body.password.length >= 6) {
        var salt = await bcrypt.genSalt(10);
        var hash = await bcrypt.hash(body.password, salt);
        await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${id}`;
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // DELETE — delete user
  if (req.method === "DELETE") {
    try {
      var id = req.query.id || (req.body && req.body.id);
      if (!id) return res.status(400).json({ ok: false, error: "id required" });
      await sql`DELETE FROM users WHERE id = ${parseInt(id)}`;
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
