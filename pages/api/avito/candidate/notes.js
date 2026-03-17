import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method === "POST") {
    var body = req.body;
    await sql`INSERT INTO candidate_notes (response_id, text, created_at) VALUES (${body.response_id}, ${body.text}, NOW())`;
    var notes = await sql`SELECT * FROM candidate_notes WHERE response_id = ${body.response_id} ORDER BY created_at DESC`;
    return res.json({ notes: notes });
  }
  if (req.method === "DELETE") {
    var id = req.query.id;
    await sql`DELETE FROM candidate_notes WHERE id = ${id}`;
    return res.json({ ok: true });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
