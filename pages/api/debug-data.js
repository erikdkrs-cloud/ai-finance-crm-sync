import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    const projects = await sql`SELECT * FROM projects ORDER BY month DESC, revenue DESC LIMIT 10`;
    const anomalies = await sql`SELECT * FROM anomalies LIMIT 5`;
    const months = await sql`SELECT DISTINCT month FROM projects ORDER BY month DESC`;
    
    const columns = projects.length > 0 ? Object.keys(projects[0]) : [];
    
    return res.status(200).json({
      ok: true,
      projectCount: projects.length,
      columns,
      sampleProjects: projects.slice(0, 3),
      anomalyCount: anomalies.length,
      sampleAnomalies: anomalies.slice(0, 2),
      months: months.map(m => m.month),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
