import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, method: req.method });

  const sql = neon(process.env.DATABASE_URL);
  const id = Number(req.query?.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ ok: false, error: "id is required (number)" });
  }

  try {
    const rows = await sql`
      SELECT
        ar.id,
        p.month,
        ar.risk_level,
        ar.summary_text,
        ar.issues,
        ar.metrics,
        ar.created_at
      FROM ai_reports ar
      JOIN periods p ON p.id = ar.period_id
      WHERE ar.id = ${id}
      LIMIT 1
    `;

    const item = rows?.[0];
    if (!item) return res.status(404).json({ ok: false, error: "not found" });

    return res.status(200).json({ ok: true, item });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
