import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  var id = req.query.id;
  if (req.method === "GET") {
    var rows = await sql`SELECT * FROM avito_responses WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    var candidate = rows[0];
    var notes = await sql`SELECT * FROM candidate_notes WHERE response_id = ${id} ORDER BY created_at DESC`;
    return res.json({ candidate: candidate, notes: notes });
  }
  if (req.method === "PATCH") {
    var body = req.body;
    if (body.candidate_name !== undefined) await sql`UPDATE avito_responses SET candidate_name = ${body.candidate_name} WHERE id = ${id}`;
    if (body.candidate_age !== undefined) await sql`UPDATE avito_responses SET candidate_age = ${body.candidate_age} WHERE id = ${id}`;
    if (body.candidate_gender !== undefined) await sql`UPDATE avito_responses SET candidate_gender = ${body.candidate_gender} WHERE id = ${id}`;
    if (body.candidate_citizenship !== undefined) await sql`UPDATE avito_responses SET candidate_citizenship = ${body.candidate_citizenship} WHERE id = ${id}`;
    if (body.phone !== undefined) await sql`UPDATE avito_responses SET phone = ${body.phone} WHERE id = ${id}`;
    if (body.status !== undefined) await sql`UPDATE avito_responses SET status = ${body.status} WHERE id = ${id}`;
    var updated = await sql`SELECT * FROM avito_responses WHERE id = ${id}`;
    return res.json({ candidate: updated[0] });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
