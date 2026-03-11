import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var data = await sql`
      SELECT r.*, v.title as vacancy_title, v.city as vacancy_city, a.name as account_name
      FROM avito_responses r
      LEFT JOIN avito_vacancies v ON v.id = r.vacancy_id
      LEFT JOIN avito_accounts a ON a.id = r.account_id
      ORDER BY r.created_at DESC
    `;
    return res.json({ ok: true, data: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
