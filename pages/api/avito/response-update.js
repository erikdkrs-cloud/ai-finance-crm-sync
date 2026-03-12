import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    var sql = neon(process.env.DATABASE_URL);
    var body = req.body || {};
    var id = Number(body.id);

    if (!id) return res.status(400).json({ ok: false, error: "id required" });

    var updates = [];
    var values = {};

    if (body.status !== undefined) {
      await sql`UPDATE avito_responses SET status = ${body.status}, updated_at = NOW() WHERE id = ${id}`;
    }
    if (body.is_read !== undefined) {
      await sql`UPDATE avito_responses SET is_read = ${body.is_read}, updated_at = NOW() WHERE id = ${id}`;
    }
    if (body.notes !== undefined) {
      await sql`UPDATE avito_responses SET notes = ${body.notes}, updated_at = NOW() WHERE id = ${id}`;
    }
    if (body.candidate_name !== undefined) {
      await sql`UPDATE avito_responses SET candidate_name = ${body.candidate_name}, updated_at = NOW() WHERE id = ${id}`;
    }
    if (body.phone !== undefined) {
      await sql`UPDATE avito_responses SET phone = ${body.phone}, updated_at = NOW() WHERE id = ${id}`;
    }

    // Mark as read when opening
    if (body.mark_read) {
      await sql`UPDATE avito_responses SET is_read = true, updated_at = NOW() WHERE id = ${id}`;
    }

    var updated = await sql`SELECT * FROM avito_responses WHERE id = ${id}`;
    return res.json({ ok: true, data: updated[0] || null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
