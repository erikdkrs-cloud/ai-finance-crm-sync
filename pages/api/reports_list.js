import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, method: req.method });

  const sql = neon(process.env.DATABASE_URL);

  try {
    const items = await sql`
      select
        ar.created_at,
        p.month,
        ar.risk_level,
        ar.summary_text,
        ar.issues,
        ar.metrics
      from ai_reports ar
      join periods p on p.id = ar.period_id
      order by ar.created_at desc
      limit 50
    `;

    return res.status(200).json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
