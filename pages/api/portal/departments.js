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
    var departments = await sql`
      SELECT d.*,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = true) as employee_count
      FROM departments d
      ORDER BY d.sort_order, d.name
    `;
    var positions = await sql`
      SELECT p.*, d.name as department_name
      FROM positions p
      LEFT JOIN departments d ON d.id = p.department_id
      ORDER BY p.sort_order, p.title
    `;
    return res.json({ departments: departments, positions: positions });
  }

  if (user.role !== "admin") {
    return res.status(403).json({ error: "Только для администратора" });
  }

  if (req.method === "POST") {
    var { type } = req.body;

    if (type === "department") {
      var { name, parent_id } = req.body;
      var result = await sql`
        INSERT INTO departments (name, parent_id) VALUES (${name}, ${parent_id || null})
        RETURNING *
      `;
      return res.json(result[0]);
    }

    if (type === "position") {
      var { title, department_id, is_head } = req.body;
      var result = await sql`
        INSERT INTO positions (title, department_id, is_head)
        VALUES (${title}, ${department_id}, ${is_head || false})
        RETURNING *
      `;
      return res.json(result[0]);
    }
  }

  if (req.method === "PUT") {
    var { type, id } = req.body;

    if (type === "department") {
      var { name, parent_id, sort_order } = req.body;
      await sql`
        UPDATE departments SET
          name = COALESCE(${name}, name),
          parent_id = ${parent_id || null},
          sort_order = COALESCE(${sort_order}, sort_order)
        WHERE id = ${id}
      `;
      return res.json({ ok: true });
    }

    if (type === "position") {
      var { title, department_id, is_head, sort_order } = req.body;
      await sql`
        UPDATE positions SET
          title = COALESCE(${title}, title),
          department_id = COALESCE(${department_id}, department_id),
          is_head = COALESCE(${is_head}, is_head),
          sort_order = COALESCE(${sort_order}, sort_order)
        WHERE id = ${id}
      `;
      return res.json({ ok: true });
    }
  }

  if (req.method === "DELETE") {
    var { type, id } = req.query;

    if (type === "department") {
      await sql`DELETE FROM positions WHERE department_id = ${id}`;
      await sql`UPDATE users SET department_id = NULL WHERE department_id = ${id}`;
      await sql`DELETE FROM departments WHERE id = ${id}`;
    }
    if (type === "position") {
      await sql`UPDATE users SET position_id = NULL WHERE position_id = ${id}`;
      await sql`DELETE FROM positions WHERE id = ${id}`;
    }
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
