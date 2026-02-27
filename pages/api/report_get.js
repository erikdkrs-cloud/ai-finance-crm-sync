import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, method: req.method });

  const sql = neon(process.env.DATABASE_URL);
  const id = Number(req.query?.id || 0);
  if (!id) return res.status(400).json({ ok: false, error: "id query param required" });

  try {
    const rows = await sql`
      SELECT
        r.id,
        r.risk_level,
        r.summary_text,
        r.issues,
        r.metrics,
        r.created_at,
        p.month
      FROM ai_reports r
      JOIN periods p ON p.id = r.period_id
      WHERE r.id = ${id}
      LIMIT 1
    `;

    const r = rows?.[0];
    if (!r) return res.status(404).json({ ok: false, error: "not found" });

    const item = {
      id: Number(r.id),
      month: r.month,
      risk_level: r.risk_level,
      summary_text: r.summary_text || "",
      issues: r.issues ?? [],
      metrics: r.metrics ?? {},
      created_at: r.created_at,
    };

    // ВАЖНО: отдаём и в корне, и в item (совместимость со всеми страницами/старым кодом)
    return res.status(200).json({
      ok: true,
      ...item,
      item,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
