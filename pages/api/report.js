import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, method: req.method });

  const sql = neon(process.env.DATABASE_URL);
  const month = String(req.body?.month || "").trim();
  if (!month) return res.status(400).json({ ok: false, error: "month is required, e.g. 2026-01" });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ ok: false, error: "OPENAI_API_KEY is not set in Vercel env" });
  }

  try {
    // 1) Берём строки месяца
    const rows = await sql`
      select
        pr.name as project,
        fr.revenue_no_vat,
        fr.salary_workers,
        fr.salary_manager,
        fr.salary_head,
        fr.ads,
        fr.transport,
        fr.penalties,
        fr.tax
      from financial_rows fr
      join periods p on p.id = fr.period_id
      join projects pr on pr.id = fr.project_id
      where p.month = ${month}
      order by pr.name
    `;

    if (!rows || rows.length === 0) {
      return res.status(200).json({ ok: true, note: "no rows for this month", month });
    }

    // 2) Метрики + простые правила
    const calc = rows.map(r => {
      const revenue = Number(r.revenue_no_vat || 0);
      const costs =
        Number(r.salary_workers || 0) +
        Number(r.salary_manager || 0) +
        Number(r.salary_head || 0) +
        Number(r.ads || 0) +
        Number(r.transport || 0) +
        Number(r.penalties || 0) +
        Number(r.tax || 0);

      const profit = revenue - costs;
      const margin = revenue > 0 ? profit / revenue : 0;

      const issues = [];
      if (revenue > 0 && margin < 0.15) issues.push({ type: "low_margin", severity: "high", msg: "Маржа ниже 15%" });
      if (Number(r.penalties || 0) > 0) issues.push({ type: "penalties", severity: "medium", msg: "Есть штрафы" });
      if (revenue > 0 && Number(r.ads || 0) / revenue > 0.12) issues.push({ type: "ads_high", severity: "medium", msg: "Реклама > 12% выручки" });
      if (revenue > 0 && Number(r.salary_workers || 0) / revenue > 0.6) issues.push({ type: "labor_high", severity: "high", msg: "ЗП подработчиков > 60% выручки" });

      return { project: r.project, ...r, profit, margin, issues };
    });

    const totals = calc.reduce(
      (a, r) => {
        a.revenue += Number(r.revenue_no_vat || 0);
        a.profit += Number(r.profit || 0);
        return a;
      },
      { revenue: 0, profit: 0 }
    );
    totals.margin = totals.revenue > 0 ? totals.profit / totals.revenue : 0;

    const issuesFlat = [];
    for (const r of calc) for (const i of r.issues) issuesFlat.push({ project: r.project, ...i });

    const risk_level =
      totals.margin < 0.1 || issuesFlat.some(x => x.severity === "high") ? "red"
      : totals.margin < 0.2 || issuesFlat.some(x => x.severity === "medium") ? "yellow"
      : "green";

    // 3) Запрос в OpenAI Responses API со Structured Outputs (JSON Schema)
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        summary_text: { type: "string" },
        top_issues: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              project: { type: "string" },
              type: { type: "string" },
              severity: { type: "string", enum: ["low","medium","high"] },
              why: { type: "string" },
              action: { type: "string" }
            },
            required: ["project","type","severity","why","action"]
          }
        },
        quick_wins: { type: "array", items: { type: "string" }, maxItems: 5 }
      },
      required: ["summary_text","top_issues","quick_wins"]
    };

    const input = [
      {
        role: "system",
        content:
          "Ты финансовый аналитик. Пиши по-русски, коротко и по делу. " +
          "Не выдумывай цифры — используй только JSON-данные. " +
          "Выдай управленческий комментарий, топ проблем и действия."
      },
      {
        role: "user",
        content: JSON.stringify({
          month,
          totals,
          projects: calc.map(r => ({
            project: r.project,
            revenue_no_vat: r.revenue_no_vat,
            profit: r.profit,
            margin: r.margin,
            ads: r.ads,
            salary_workers: r.salary_workers,
            penalties: r.penalties,
            issues: r.issues
          })),
          issuesFlat
        })
      }
    ];

    const oaResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input,
        text: {
          format: {
            type: "json_schema",
            name: "monthly_report",
            strict: true,
            schema
          }
        }
      })
    });

    const oaJson = await oaResp.json();
    if (!oaResp.ok) {
      return res.status(500).json({ ok: false, error: "OpenAI error", details: oaJson });
    }

    // В Responses API текстовая агрегация "output_text" — SDK-only,
    // поэтому аккуратно достаём output_text из массива output
    const outText =
      (oaJson.output || [])
        .flatMap(x => x.content || [])
        .filter(c => c.type === "output_text")
        .map(c => c.text)
        .join("")
        .trim();

    const reportObj = outText ? JSON.parse(outText) : null;
    if (!reportObj) {
      return res.status(500).json({ ok: false, error: "Could not parse model JSON", raw: oaJson });
    }

    // 4) Сохраняем в ai_reports
    const period = await sql`select id from periods where month=${month} limit 1`;
    if (!period?.[0]?.id) return res.status(500).json({ ok: false, error: "period not found" });

    await sql`
      insert into ai_reports (period_id, risk_level, summary_text, issues, metrics)
      values (
        ${period[0].id},
        ${risk_level},
        ${reportObj.summary_text},
        ${JSON.stringify(issuesFlat)}::jsonb,
        ${JSON.stringify({ totals })}::jsonb
      )
    `;

    return res.status(200).json({ ok: true, month, risk_level, rows: rows.length });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
