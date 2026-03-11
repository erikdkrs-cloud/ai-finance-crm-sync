import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  var sql = neon(process.env.DATABASE_URL);

  if (req.method === "GET") {
    var vacancyId = req.query.vacancy_id;
    var status = req.query.status || "";

    var rows;
    if (vacancyId) {
      rows = await sql`
        SELECT r.*, v.title as vacancy_title
        FROM avito_responses r
        LEFT JOIN avito_vacancies v ON v.id = r.vacancy_id
        WHERE r.vacancy_id = ${Number(vacancyId)}
        ORDER BY r.created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT r.*, v.title as vacancy_title, a.name as account_name
        FROM avito_responses r
        LEFT JOIN avito_vacancies v ON v.id = r.vacancy_id
        LEFT JOIN avito_accounts a ON a.id = r.account_id
        ORDER BY r.created_at DESC
        LIMIT 500
      `;
    }

    if (status) {
      rows = rows.filter(function (r) { return r.status === status; });
    }

    return res.json({ ok: true, responses: rows });
  }

  if (req.method === "POST") {
    var body = req.body || {};
    var id = Number(body.id);
    var newStatus = body.status;
    var notes = body.manager_notes;

    if (!id) return res.status(400).json({ ok: false, error: "id required" });

    if (newStatus) {
      await sql`UPDATE avito_responses SET status = ${newStatus} WHERE id = ${id}`;
    }
    if (notes !== undefined) {
      await sql`UPDATE avito_responses SET manager_notes = ${notes} WHERE id = ${id}`;
    }

    return res.json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
