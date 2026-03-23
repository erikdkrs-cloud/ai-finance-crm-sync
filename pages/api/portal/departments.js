import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  var sql = neon(process.env.DATABASE_URL);

  if (req.method === "GET") {
    try {
      var rows = await sql("SELECT * FROM portal_departments ORDER BY name");
      return res.json({ departments: rows });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === "POST") {
    var { name, head_employee_id } = req.body;
    if (!name) return res.status(400).json({ error: "Название обязательно" });
    try {
      var rows = await sql("INSERT INTO portal_departments (name, head_employee_id) VALUES ($1, $2) RETURNING *", [name, head_employee_id || null]);
      return res.json({ department: rows[0] });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === "PUT") {
    var { id, name, head_employee_id } = req.body;
    try {
      var rows = await sql("UPDATE portal_departments SET name=$1, head_employee_id=$2 WHERE id=$3 RETURNING *", [name, head_employee_id || null, id]);
      return res.json({ department: rows[0] });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === "DELETE") {
    var { id } = req.body;
    try {
      await sql("DELETE FROM portal_departments WHERE id=$1", [id]);
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  res.status(405).json({ error: "Method not allowed" });
}
