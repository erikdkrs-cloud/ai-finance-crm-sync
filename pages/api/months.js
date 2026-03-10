import { neon } from "@neondatabase/serverless";
import { getUserProjectIds } from "../../lib/getUserProjects";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, method: req.method });

  var sql = neon(process.env.DATABASE_URL);

  try {
    var projectIds = await getUserProjectIds(req);

    var rows;
    if (projectIds === null) {
      rows = await sql`
        SELECT DISTINCT p.month FROM periods p
        WHERE p.month ~ '^[0-9]{4}-[0-9]{2}$'
        ORDER BY p.month DESC LIMIT 36
      `;
    } else if (projectIds.length === 0) {
      return res.status(200).json({ ok: true, months: [] });
    } else {
      rows = await sql`
        SELECT DISTINCT per.month FROM periods per
        JOIN financial_rows f ON f.period_id = per.id
        WHERE per.month ~ '^[0-9]{4}-[0-9]{2}$'
          AND f.project_id = ANY(${projectIds})
        ORDER BY per.month DESC LIMIT 36
      `;
    }

    return res.status(200).json({ ok: true, months: rows.map(function (r) { return r.month; }) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
