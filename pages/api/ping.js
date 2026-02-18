import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, where: "ping-import", method: req.method });
  }

  const sql = neon(process.env.DATABASE_URL);
  const { rows } = req.body || {};
  if (!Array.isArray(rows)) return res.status(400).json({ ok: false, error: "rows must be an array" });

  try {
    let imported = 0;

    for (const r of rows) {
      const month = String(r.month || "").trim();
      const project = String(r.project || "").trim();
      if (!month || !project) continue;

      await sql`insert into periods (month) values (${month})
                on conflict (month) do nothing`;

      await sql`insert into projects (name) values (${project})
                on conflict (name) do nothing`;

      await sql`
        insert into financial_rows (
          project_id, period_id,
          revenue_no_vat, salary_workers, salary_manager, salary_head,
          ads, transport, penalties, tax
        )
        values (
          (select id from projects where name=${project}),
          (select id from periods where month=${month}),
          ${Number(r.revenue_no_vat || 0)},
          ${Number(r.salary_workers || 0)},
          ${Number(r.salary_manager || 0)},
          ${Number(r.salary_head || 0)},
          ${Number(r.ads || 0)},
          ${Number(r.transport || 0)},
          ${Number(r.penalties || 0)},
          ${Number(r.tax || 0)}
        )
        on conflict (project_id, period_id)
        do update set
          revenue_no_vat = excluded.revenue_no_vat,
          salary_workers = excluded.salary_workers,
          salary_manager = excluded.salary_manager,
          salary_head = excluded.salary_head,
          ads = excluded.ads,
          transport = excluded.transport,
          penalties = excluded.penalties,
          tax = excluded.tax
      `;

      imported++;
    }

    return res.status(200).json({ ok: true, imported });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
