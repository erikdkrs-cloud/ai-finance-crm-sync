import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    // 1. Все таблицы
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    const result = { tables: tables.map((t) => t.table_name), details: {} };

    // 2. Для каждой таблицы — колонки + 2 строки
    for (const t of tables) {
      const name = t.table_name;
      
      const cols = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ${name}
        ORDER BY ordinal_position
      `;

      const sample = await sql(`SELECT * FROM "${name}" LIMIT 2`);

      result.details[name] = {
        columns: cols.map((c) => `${c.column_name} (${c.data_type})`),
        sampleRows: sample,
      };
    }

    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
