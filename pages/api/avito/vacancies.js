import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var role = req.headers["x-user-role"] || "";
    var userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;

    var data;
    if (role === "manager" && userId) {
      data = await sql`
        SELECT v.*, a.name as account_name
        FROM avito_vacancies v
        LEFT JOIN avito_accounts a ON a.id = v.account_id
        INNER JOIN user_projects up ON up.project_id = v.project_id AND up.user_id = ${userId}
        ORDER BY v.responses_count DESC NULLS LAST, v.created_at DESC
      `;
    } else {
      data = await sql`
        SELECT v.*, a.name as account_name
        FROM avito_vacancies v
        LEFT JOIN avito_accounts a ON a.id = v.account_id
        ORDER BY v.responses_count DESC NULLS LAST, v.created_at DESC
      `;
    }

    return res.json({ ok: true, data: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
