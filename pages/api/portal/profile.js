import { neon } from "@neondatabase/serverless";
import { verifySessionToken, getCookie } from "../../../lib/auth";

async function getUser(req) {
  try {
    var token = getCookie(req, "ai_finance_session");
    if (!token) return null;
    var payload = await verifySessionToken(token);
    return payload;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  var sql = neon(process.env.DATABASE_URL);
  var user = await getUser(req);

  if (!user) return res.status(401).json({ error: "Не авторизован" });

  if (req.method === "GET") {
    var userId = req.query.id || user.userId;

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

  if (req.method === "PUT") {
    var { first_name, last_name, middle_name, phone, telegram, birth_date, about, hobbies, photo_url, user_id } = req.body;
    var targetId = user_id || user.userId;

    // Только сам себя или админ
    if (String(targetId) !== String(user.userId) && user.role !== "admin") {
      return res.status(403).json({ error: "Нет прав" });
    }

    // Обновляем name если есть first/last
    var nameUpdate = "";
    if (first_name || last_name) {
      var currentUser = await sql`SELECT first_name, last_name, middle_name FROM users WHERE id = ${targetId}`;
      if (currentUser.length > 0) {
        var fn = first_name || currentUser[0].first_name || "";
        var ln = last_name || currentUser[0].last_name || "";
        var mn = middle_name !== undefined ? middle_name : (currentUser[0].middle_name || "");
        var fullName = ln + " " + fn + (mn ? " " + mn : "");

        await sql`
          UPDATE users SET
            first_name = ${fn},
            last_name = ${ln},
            middle_name = ${mn},
            name = ${fullName},
            phone = COALESCE(${phone}, phone),
            telegram = COALESCE(${telegram}, telegram),
            birth_date = ${birth_date || null},
            about = COALESCE(${about}, about),
            hobbies = COALESCE(${hobbies}, hobbies),
            photo_url = COALESCE(${photo_url}, photo_url),
            updated_at = NOW()
          WHERE id = ${targetId}
        `;
      }
    } else {
      await sql`
        UPDATE users SET
          phone = COALESCE(${phone}, phone),
          telegram = COALESCE(${telegram}, telegram),
          birth_date = ${birth_date || null},
          about = COALESCE(${about}, about),
          hobbies = COALESCE(${hobbies}, hobbies),
          photo_url = COALESCE(${photo_url}, photo_url),
          updated_at = NOW()
        WHERE id = ${targetId}
      `;
    }

    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
