import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);

    var data = await sql`
      SELECT 
        avito_id,
        title,
        city,
        address,
        raw_data->>'address' as raw_address
      FROM avito_vacancies
      ORDER BY title
      LIMIT 50
    `;

    return res.json({ ok: true, count: data.length, vacancies: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
