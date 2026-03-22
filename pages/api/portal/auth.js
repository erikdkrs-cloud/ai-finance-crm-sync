import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export default async function handler(req, res) {
  var sql = neon(process.env.DATABASE_URL);
  
  if (req.method === "POST") {
    var { action } = req.body;
    
    // Логин
    if (action === "login") {
      var { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email и пароль обязательны" });
      }
      
      var users = await sql`
        SELECT u.*, d.name as department_name, p.title as position_title
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN positions p ON p.id = u.position_id
        WHERE u.email = ${email.toLowerCase().trim()} AND u.is_active = true
      `;
      
      if (users.length === 0) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }
      
      var user = users[0];
      
      if (user.password_hash !== hashPassword(password)) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }
      
      // Создаём сессию на 30 дней
      var token = generateToken();
      var expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      await sql`
        INSERT INTO sessions (token, user_id, expires_at)
        VALUES (${token}, ${user.id}, ${expiresAt.toISOString()})
      `;
      
      return res.json({
        token: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          first_name: user.first_name,
          last_name: user.last_name,
          middle_name: user.middle_name,
          role: user.role,
          photo_url: user.photo_url,
          department_name: user.department_name,
          position_title: user.position_title
        }
      });
    }
    
    // Проверка сессии
    if (action === "me") {
      var { token } = req.body;
      if (!token) return res.status(401).json({ error: "Не авторизован" });
      
      var sessions = await sql`
        SELECT s.*, u.*, d.name as department_name, p.title as position_title
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN positions p ON p.id = u.position_id
        WHERE s.token = ${token} AND s.expires_at > NOW() AND u.is_active = true
      `;
      
      if (sessions.length === 0) {
        return res.status(401).json({ error: "Сессия истекла" });
      }
      
      var user = sessions[0];
      return res.json({
        user: {
          id: user.user_id,
          email: user.email,
          name: user.name,
          first_name: user.first_name,
          last_name: user.last_name,
          middle_name: user.middle_name,
          role: user.role,
          photo_url: user.photo_url,
          phone: user.phone,
          telegram: user.telegram,
          birth_date: user.birth_date,
          about: user.about,
          hobbies: user.hobbies,
          department_id: user.department_id,
          position_id: user.position_id,
          department_name: user.department_name,
          position_title: user.position_title
        }
      });
    }
    
    // Выход
    if (action === "logout") {
      var { token } = req.body;
      if (token) {
        await sql`DELETE FROM sessions WHERE token = ${token}`;
      }
      return res.json({ ok: true });
    }
  }
  
  return res.status(405).json({ error: "Method not allowed" });
}
