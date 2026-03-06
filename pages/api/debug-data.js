import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    // Узнаём все таблицы
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    // Узнаём колонки таблицы projects
    const projectCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'projects'
      ORDER BY ordinal_position
    `;

    // Узнаём колонки таблицы anomalies
    const anomalyCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'anomalies'
      ORDER BY ordinal_position
    `;

    // Узнаём колонки таблицы reports
    const reportCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'reports'
      ORDER BY ordinal_position
    `;

    // Берём 3 строки из projects без фильтра
    const sampleProjects = await sql`SELECT * FROM projects LIMIT 3`;

    // Берём 2 строки из anomalies
    const sampleAnomalies = await sql`SELECT * FROM anomalies LIMIT 2`;

    // Берём 2 строки из reports
    const sampleReports = await sql`SELECT * FROM reports LIMIT 2`;

    return res.status(200).json({
      ok: true,
      tables: tables.map((t) => t.table_name),
      projectColumns: projectCols,
      anomalyColumns: anomalyCols,
      reportColumns: reportCols,
      sampleProjects,
      sampleAnomalies,
      sampleReports,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
