import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  var sql = neon(process.env.DATABASE_URL);

  if (req.method === "GET") {
    try {
      var rows = await sql("SELECT * FROM portal_employees ORDER BY last_name");
      return res.json({ employees: rows });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === "PUT") {
    var { id, department_id, position_id, first_name, last_name, middle_name, phone, birth_date } = req.body;
    try {
      var rows = await sql(
        "UPDATE portal_employees SET department_id=$1, position_id=$2, first_name=COALESCE($3,first_name), last_name=COALESCE($4,last_name), middle_name=COALESCE($5,middle_name), phone=COALESCE($6,phone), birth_date=COALESCE($7,birth_date) WHERE id=$8 RETURNING *",
        [department_id || null, position_id || null, first_name || null, last_name || null, middle_name || null, phone || null, birth_date || null, id]
      );
      return res.json({ employee: rows[0] });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  res.status(405).json({ error: "Method not allowed" });
}
