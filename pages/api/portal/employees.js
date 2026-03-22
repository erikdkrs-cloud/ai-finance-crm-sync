import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function getUser(sql, token) {
  if (!token) return null;
  var sessions = await sql`
    SELECT s.user_id FROM sessions s WHERE s.token = ${token} AND s.expires_at > NOW()
  `;
  if (sessions.length === 0) return null;
  var users = await sql`SELECT * FROM users WHERE id = ${sessions[0].user_id} AND is_active = true`;
  return users.length > 0 ? users[0] : null;
}

export default async function handler(req, res) {
  var sql = neon(process.env.DATABASE_URL);
  var token = (req.headers.authorization || "").replace("Bearer ", "");
  var user = await getUser(sql, token);
  
  if (!user) return res.status(401).json({ error: "Не авторизован" });
  
  // Получить всех сотрудников
  if (req.method === "GET") {
    var employees = await sql`
      SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.middle_name,
             u.phone, u.telegram, u.birth_date, u.photo_url, u.about, u.hobbies,
             u.role, u.department_id, u.position_id, u.is_active, u.created_at,
             d.name as department_name, p.title as position_title
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN positions p ON p.id = u.position_id
      ORDER BY u.last_name, u.first_name
    `;
    return res.json(employees);
  }
  
  // Только админ может управлять
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Только для администратора" });
  }
  
  // Создать сотрудника
  if (req.method === "POST") {
    var { email, password, first_name, last_name, middle_name, role, department_id, position_id } = req.body;
    
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: "Заполните обязательные поля" });
    }
    
    var existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
    if (existing.length > 0) {
      return res.status(400).json({ error: "Пользователь с таким email уже существует" });
    }
    
    var fullName = last_name + " " + first_name + (middle_name ? " " + middle_name : "");
    
    var result = await sql`
      INSERT INTO users (email, password_hash, name, first_name, last_name, middle_name, role, department_id, position_id)
      VALUES (${email.toLowerCase().trim()}, ${hashPassword(password)}, ${fullName}, ${first_name}, ${last_name}, ${middle_name || ''}, ${role || 'employee'}, ${department_id || null}, ${position_id || null})
      RETURNING id
    `;
    
    return res.json({ id: result[0].id, ok: true });
  }
  
  // Обновить сотрудника (админ)
  if (req.method === "PUT") {
    var { user_id, email, first_name, last_name, middle_name, role, department_id, position_id, is_active, password } = req.body;
    
    if (!user_id) return res.status(400).json({ error: "user_id обязателен" });
    
    var fullName = (last_name || "") + " " + (first_name || "") + (middle_name ? " " + middle_name : "");
    
    await sql`
      UPDATE users SET
        email = COALESCE(${email}, email),
        name = ${fullName},
        first_name = COALESCE(${first_name}, first_name),
        last_name = COALESCE(${last_name}, last_name),
        middle_name = COALESCE(${middle_name}, middle_name),
        role = COALESCE(${role}, role),
        department_id = ${department_id || null},
        position_id = ${position_id || null},
        is_active = COALESCE(${is_active}, is_active),
        updated_at = NOW()
      WHERE id = ${user_id}
    `;
    
    if (password) {
      await sql`UPDATE users SET password_hash = ${hashPassword(password)} WHERE id = ${user_id}`;
    }
    
    return res.json({ ok: true });
  }
  
  // Удалить (деактивировать)
  if (req.method === "DELETE") {
    var { id } = req.query;
    await sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${id}`;
    return res.json({ ok: true });
  }
  
  return res.status(405).json({ error: "Method not allowed" });
}
