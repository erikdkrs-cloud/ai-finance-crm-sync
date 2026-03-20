import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);

    await sql`
      UPDATE avito_vacancies 
      SET address = raw_data->>'address'
      WHERE (address IS NULL OR address = '')
      AND raw_data->>'address' IS NOT NULL
      AND raw_data->>'address' != ''
    `;

    return res.json({ ok: true, message: "Addresses updated from raw_data" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
