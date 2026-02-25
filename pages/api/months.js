import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, method: req.method });

  const sql = neon(process.env.DATABASE_URL);

  try {
    const rows = await sql`
      SELECT month
      FROM periods
      WHERE month ~ '^[0-9]{4}-[0-9]{2}$'
      ORDER BY month DESC
      LIMIT 36
    `;

    return res.status(200).json({ ok: true, months: rows.map(r => r.month) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
