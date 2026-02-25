import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, method: req.method });

  const sql = neon(process.env.DATABASE_URL);
  const month = String(req.query?.month || "").trim(); // optional

  try {
    const rows = await sql`
      SELECT
        ar.id,
        p.month,
        ar.risk_level,
        ar.summary_text,
        ar.created_at
      FROM ai_reports ar
      JOIN periods p ON p.id = ar.period_id
      WHERE (${month} = '' OR p.month = ${month})
      ORDER BY ar.created_at DESC
      LIMIT 200
    `;

    return res.status(200).json({ ok: true, items: rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
