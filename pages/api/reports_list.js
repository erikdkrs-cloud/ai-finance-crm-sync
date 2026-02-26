import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, method: req.method });

  const sql = neon(process.env.DATABASE_URL);

  try {
    const rows = await sql`
      SELECT
        r.id,
        p.month,
        r.risk_level,
        r.summary_text,
        r.created_at
      FROM ai_reports r
      JOIN periods p ON p.id = r.period_id
      ORDER BY r.created_at DESC
      LIMIT 200
    `;

    const items = rows.map(x => ({
      id: Number(x.id),
      month: x.month,
      risk_level: x.risk_level,
      summary_text: x.summary_text || "",
      created_at: x.created_at,
    }));

    return res.status(200).json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
