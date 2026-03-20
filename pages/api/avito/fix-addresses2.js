import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);

    // Сначала посмотрим сколько записей без адреса
    var before = await sql`
      SELECT COUNT(*) as cnt FROM avito_vacancies 
      WHERE (address IS NULL OR address = '')
    `;

    // Обновляем адреса из raw_data
    var updated = await sql`
      UPDATE avito_vacancies 
      SET address = raw_data->>'address'
      WHERE (address IS NULL OR address = '')
      AND raw_data IS NOT NULL
      AND raw_data::text != 'null'
      AND raw_data->>'address' IS NOT NULL
      AND raw_data->>'address' != ''
      RETURNING id, avito_id, address
    `;

    // Проверяем сколько осталось без адреса
    var after = await sql`
      SELECT COUNT(*) as cnt FROM avito_vacancies 
      WHERE (address IS NULL OR address = '')
    `;

    return res.json({ 
      ok: true, 
      before_empty: before[0].cnt,
      updated_count: updated.length,
      after_empty: after[0].cnt,
      sample: updated.slice(0, 5)
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
