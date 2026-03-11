import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var accountId = req.query.account_id;
    var status = req.query.status || "";
    var search = req.query.search || "";

    var rows;
    if (accountId) {
      rows = await sql`
        SELECT v.*, a.name as account_name
        FROM avito_vacancies v
        JOIN avito_accounts a ON a.id = v.account_id
        WHERE v.account_id = ${Number(accountId)}
        ORDER BY v.created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT v.*, a.name as account_name
        FROM avito_vacancies v
        JOIN avito_accounts a ON a.id = v.account_id
        ORDER BY v.created_at DESC
      `;
    }

    // Filter by status
    if (status) {
      rows = rows.filter(function (r) { return r.status === status; });
    }

    // Filter by search
    if (search) {
      var q = search.toLowerCase();
      rows = rows.filter(function (r) {
        return (r.title || "").toLowerCase().indexOf(q) !== -1 ||
               (r.city || "").toLowerCase().indexOf(q) !== -1;
      });
    }

    // Stats
    var allRows = await sql`
      SELECT status, COUNT(*) as cnt FROM avito_vacancies GROUP BY status
    `;
    var stats = { total: 0, active: 0, removed: 0, blocked: 0 };
    allRows.forEach(function (r) {
      stats[r.status] = Number(r.cnt);
      stats.total += Number(r.cnt);
    });

    return res.json({ ok: true, vacancies: rows, stats: stats });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
