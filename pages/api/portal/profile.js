import { neon } from "@neondatabase/serverless";

async function getUser(sql, token) {
  if (!token) return null;
  var sessions = await sql`
    SELECT s.user_id FROM sessions s
    WHERE s.token = ${token} AND s.expires_at > NOW()
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
  
  // Получить профиль
  if (req.method === "GET") {
    var userId = req.query.id || user.id;
    
    var profiles = await sql`
      SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.middle_name,
             u.phone, u.telegram, u.birth_date, u.photo_url, u.about, u.hobbies,
             u.role, u.department_id, u.position_id,
             d.name as department_name, p.title as position_title
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN positions p ON p.id = u.position_id
      WHERE u.id = ${userId} AND u.is_active = true
    `;
    
    if (profiles.length === 0) return res.status(404).json({ error: "Не найден" });
    return res.json(profiles[0]);
  }
  
  // Обновить профиль
  if (req.method === "PUT") {
    var { first_name, last_name, middle_name, phone, telegram, birth_date, about, hobbies, photo_url } = req.body;
    var targetId = req.body.user_id || user.id;
    
    // Только сам себя или админ
    if (targetId !== user.id && user.role !== "admin") {
      return res.status(403).json({ error: "Нет прав" });
    }
    
    await sql`
      UPDATE users SET
        first_name = COALESCE(${first_name}, first_name),
        last_name = COALESCE(${last_name}, last_name),
        middle_name = COALESCE(${middle_name}, middle_name),
        phone = COALESCE(${phone}, phone),
        telegram = COALESCE(${telegram}, telegram),
        birth_date = COALESCE(${birth_date || null}, birth_date),
        about = COALESCE(${about}, about),
        hobbies = COALESCE(${hobbies}, hobbies),
        photo_url = COALESCE(${photo_url}, photo_url),
        updated_at = NOW()
      WHERE id = ${targetId}
    `;
    
    return res.json({ ok: true });
  }
  
  return res.status(405).json({ error: "Method not allowed" });
}
