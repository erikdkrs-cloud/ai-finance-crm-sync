import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  var sql = neon(process.env.DATABASE_URL);

  if (req.method === "GET") {
    try {
      var rows = await sql("SELECT * FROM portal_positions ORDER BY title");
      return res.json({ positions: rows });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === "POST") {
    var { title, department_id } = req.body;
    if (!title) return res.status(400).json({ error: "Название обязательно" });
    try {
      var rows = await sql("INSERT INTO portal_positions (title, department_id) VALUES ($1, $2) RETURNING *", [title, department_id || null]);
      return res.json({ position: rows[0] });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === "DELETE") {
    var { id } = req.body;
    try {
      await sql("DELETE FROM portal_positions WHERE id=$1", [id]);
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  res.status(405).json({ error: "Method not allowed" });
}
