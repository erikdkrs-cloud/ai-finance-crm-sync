import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var role = req.headers["x-user-role"] || "";
    var userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;

    var data;
    if (role === "manager" && userId) {
      data = await sql`
SELECT r.id, r.vacancy_id, r.account_id, r.avito_chat_id, 
  r.author_name, r.author_phone, r.message, r.status,
  r.manager_notes, r.created_at, r.raw_data, r.phone,
  r.candidate_name, r.candidate_age, r.candidate_citizenship,
  r.candidate_gender, r.is_read, r.notes, r.updated_at,
  r.vacancy_code,
  COALESCE(NULLIF(r.vacancy_title,''), v.title, '—') as vacancy_title,
  COALESCE(NULLIF(r.vacancy_city,''), v.city, '—') as vacancy_city,
  COALESCE(NULLIF(r.vacancy_address,''), v.address, '—') as vacancy_address,
  a.name as account_name
FROM avito_responses r
LEFT JOIN avito_vacancies v ON CAST(v.avito_id AS TEXT) = CAST(r.vacancy_code AS TEXT)
LEFT JOIN avito_accounts a ON a.id = r.account_id
INNER JOIN user_projects up ON up.project_id = COALESCE(v.project_id, r.vacancy_id) AND up.user_id = ${userId}
ORDER BY r.created_at DESC
      `;
    } else {
      data = await sql`
SELECT r.id, r.vacancy_id, r.account_id, r.avito_chat_id,
  r.author_name, r.author_phone, r.message, r.status,
  r.manager_notes, r.created_at, r.raw_data, r.phone,
  r.candidate_name, r.candidate_age, r.candidate_citizenship,
  r.candidate_gender, r.is_read, r.notes, r.updated_at,
  r.vacancy_code,
  COALESCE(NULLIF(r.vacancy_title,''), v.title, '—') as vacancy_title,
  COALESCE(NULLIF(r.vacancy_city,''), v.city, '—') as vacancy_city,
  COALESCE(NULLIF(r.vacancy_address,''), v.address, '—') as vacancy_address,
  a.name as account_name
FROM avito_responses r
LEFT JOIN avito_vacancies v ON CAST(v.avito_id AS TEXT) = CAST(r.vacancy_code AS TEXT)
LEFT JOIN avito_accounts a ON a.id = r.account_id
ORDER BY r.created_at DESC
      `;
    }

    return res.json({ ok: true, data: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
