import { neon } from "@neondatabase/serverless";

function num(x){ return Number(x || 0); }
function round2(x){ return Math.round(num(x) * 100) / 100; }
function round4(x){ return Math.round(num(x) * 10000) / 10000; }

function computeRiskFromTotals({ revenue, margin }, issues=[]) {
  let risk = "green";
  if (revenue > 0 && margin < 0.10) risk = "red";
  else if (revenue > 0 && margin < 0.20) risk = "yellow";

  // если есть high-issues — red, medium — минимум yellow
  if (issues.some(i => i?.severity === "high")) risk = "red";
  else if (issues.some(i => i?.severity === "medium") && risk === "green") risk = "yellow";

  return risk;
}

function buildSummaryText({ month, totals, prevTotals, risk_level, issues, recommendations, top_projects }) {
  const fmt = (n) => Number(n || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  const pct = (x) => (Number(x || 0) * 100).toFixed(1) + "%";

  const deltaLine = prevTotals
    ? `\nСравнение с прошлым месяцем: маржа ${pct(totals.margin)} (${((totals.margin - prevTotals.margin) * 100).toFixed(1)} п.п.), прибыль ${fmt(totals.profit)} (${fmt(totals.profit - prevTotals.profit)}).`
    : "";

  const issuesText = (issues || []).slice(0, 8).map(i =>
    `- [${i.severity}] ${i.title}${i.details ? ` — ${i.details}` : ""}`
  ).join("\n");

  const topText = (top_projects || []).slice(0, 5).map(p =>
    `- ${p.project}: маржа ${(p.margin*100).toFixed(1)}%, прибыль ${fmt(p.profit)}, выручка ${fmt(p.revenue)}`
  ).join("\n");

  const recText = (recommendations || []).slice(0, 8).map(r => `- ${r}`).join("\n");

  return (
`Месяц: ${month}
Риск: ${risk_level}

KPI:
- Выручка: ${fmt(totals.revenue)}
- Расходы: ${fmt(totals.costs)}
- Прибыль: ${fmt(totals.profit)}
- Маржа: ${pct(totals.margin)}${deltaLine}

Топ проблемных проектов:
${topText || "- нет данных"}

Проблемы и сигналы:
${issuesText || "- явных проблем по правилам не найдено"}

Рекомендации (что сделать):
${recText || "- нет"}
`
  );
}

async function callOpenAI({ apiKey, month, totals, prevTotals, projects }) {
  const prompt = `
Ты финансовый аналитик и COO. Сгенерируй управленческий отчёт за месяц ${month}.
Входные данные:
- totals: ${JSON.stringify(totals)}
- prevTotals (если есть): ${JSON.stringify(prevTotals || null)}
- projects: ${JSON.stringify(projects)}

Нужно вернуть СТРОГО валидный JSON (без markdown), структура:

{
  "risk_level": "green" | "yellow" | "red",
  "issues": [
    { "severity": "high"|"medium"|"low", "title": "...", "details": "..." }
  ],
  "top_projects": [
    { "project":"...", "revenue": number, "profit": number, "margin": number, "note":"..." }
  ],
  "recommendations": [
    "короткое действие 1",
    "короткое действие 2"
  ],
  "metrics": {
    "totals": { "revenue":..., "costs":..., "profit":..., "margin":... },
    "prevTotals": null или {...},
    "deltas": { "profit_delta":..., "margin_delta_pp":... },
    "projects_count": number
  }
}

Правила риска:
- если маржа < 10% → red
- если маржа < 20% → минимум yellow
- наличие серьезных проблем (high) → red
- наличие medium → минимум yellow

Требования к содержанию:
- issues: не меньше 5 пунктов (если данных мало — сформулируй безопасно)
- recommendations: 5–10 конкретных действий, кратко, по делу
- top_projects: 3–5 проектов с худшей маржой
`.trim();

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Отвечай только валидным JSON строго по схеме." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`OpenAI HTTP ${r.status}: ${txt.slice(0, 300)}`);
  }

  const j = await r.json();
  const content = j?.choices?.[0]?.message?.content || "";
  let parsed;
  try { parsed = JSON.parse(content); }
  catch { throw new Error("OpenAI вернул не-JSON: " + content.slice(0, 200)); }

  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, method: req.method });
  }

  const sql = neon(process.env.DATABASE_URL);
  const month = String(req.query?.month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ ok: false, error: `month must be YYYY-MM, got: "${month}"` });
  }

  try {
    // period
    const periodRows = await sql`SELECT id, month FROM periods WHERE month = ${month} LIMIT 1`;
    const period = periodRows?.[0];
    if (!period?.id) return res.status(404).json({ ok: false, error: `period not found for month=${month}` });
    const period_id = Number(period.id);

    // previous month (по periods)
    const prevRows = await sql`
      SELECT id, month
      FROM periods
      WHERE month < ${month}
      ORDER BY month DESC
      LIMIT 1
    `;
    const prevPeriod = prevRows?.[0] ? { id: Number(prevRows[0].id), month: prevRows[0].month } : null;

    // rows for month
    const rows = await sql`
      SELECT
        pr.name AS project,
        fr.revenue_no_vat,
        fr.salary_workers,
        fr.salary_manager,
        fr.salary_head,
        fr.ads,
        fr.transport,
        fr.penalties,
        fr.tax
      FROM financial_rows fr
      JOIN projects pr ON pr.id = fr.project_id
      WHERE fr.period_id = ${period_id}
      ORDER BY pr.name
    `;

    const projects = rows.map(r => {
      const revenue = num(r.revenue_no_vat);
      const costs =
        num(r.salary_workers) + num(r.salary_manager) + num(r.salary_head) +
        num(r.ads) + num(r.transport) + num(r.penalties) + num(r.tax);
      const profit = revenue - costs;
      const margin = revenue > 0 ? profit / revenue : 0;

      let risk = "green";
      if (revenue > 0 && margin < 0.10) risk = "red";
      else if (revenue > 0 && margin < 0.20) risk = "yellow";
      if (num(r.penalties) > 0 && risk === "green") risk = "yellow";

      return {
        project: r.project,
        revenue: round2(revenue),
        costs: round2(costs),
        profit: round2(profit),
        margin: round4(margin),
        risk,
        penalties: round2(num(r.penalties)),
        ads: round2(num(r.ads)),
        labor: round2(num(r.salary_workers)),
      };
    });

    const totalsRaw = projects.reduce((a, p) => {
      a.revenue += num(p.revenue);
      a.costs += num(p.costs);
      a.profit += num(p.profit);
      return a;
    }, { revenue: 0, costs: 0, profit: 0 });

    const totals = {
      revenue: round2(totalsRaw.revenue),
      costs: round2(totalsRaw.costs),
      profit: round2(totalsRaw.profit),
      margin: round4(totalsRaw.revenue > 0 ? totalsRaw.profit / totalsRaw.revenue : 0),
    };

    // prev totals (optional)
    let prevTotals = null;
    if (prevPeriod?.id) {
      const prevData = await sql`
        SELECT
          fr.revenue_no_vat,
          fr.salary_workers,
          fr.salary_manager,
          fr.salary_head,
          fr.ads,
          fr.transport,
          fr.penalties,
          fr.tax
        FROM financial_rows fr
        WHERE fr.period_id = ${prevPeriod.id}
      `;

      const prevAgg = prevData.reduce((a, r) => {
        const revenue = num(r.revenue_no_vat);
        const costs =
          num(r.salary_workers) + num(r.salary_manager) + num(r.salary_head) +
          num(r.ads) + num(r.transport) + num(r.penalties) + num(r.tax);
        a.revenue += revenue;
        a.costs += costs;
        a.profit += (revenue - costs);
        return a;
      }, { revenue: 0, costs: 0, profit: 0 });

      prevTotals = {
        revenue: round2(prevAgg.revenue),
        costs: round2(prevAgg.costs),
        profit: round2(prevAgg.profit),
        margin: round4(prevAgg.revenue > 0 ? prevAgg.profit / prevAgg.revenue : 0),
        month: prevPeriod.month
      };
    }

    // AI
    const apiKey = process.env.OPENAI_API_KEY || "";
    let risk_level = "green";
    let issues = [];
    let metrics = {};
    let recommendations = [];
    let top_projects = [];

    if (apiKey) {
      try {
        const ai = await callOpenAI({ apiKey, month, totals, prevTotals, projects });

        issues = Array.isArray(ai.issues) ? ai.issues : [];
        recommendations = Array.isArray(ai.recommendations) ? ai.recommendations : [];
        top_projects = Array.isArray(ai.top_projects) ? ai.top_projects : [];

        risk_level = String(ai.risk_level || computeRiskFromTotals(totals, issues));
        metrics = ai.metrics || {};
      } catch (e) {
        // fallback: без OpenAI
        risk_level = computeRiskFromTotals(totals, []);
        issues = [
          { severity: "medium", title: "AI недоступен", details: "Использован fallback-отчёт (проверь OPENAI_API_KEY/лимиты)." },
          { severity: "low", title: "Маржа", details: `Маржа ${(totals.margin*100).toFixed(1)}%` },
        ];
        recommendations = ["Проверить ключ OpenAI и лимиты", "Пересчитать отчёт после восстановления AI"];
        top_projects = [...projects].sort((a,b)=>(a.margin??0)-(b.margin??0)).slice(0,5);
        metrics = {
          totals,
          prevTotals: prevTotals || null,
          deltas: prevTotals ? { profit_delta: round2(totals.profit - prevTotals.profit), margin_delta_pp: round2((totals.margin - prevTotals.margin)*100) } : null,
          projects_count: projects.length
        };
      }
    } else {
      risk_level = computeRiskFromTotals(totals, []);
      issues = [
        { severity: "medium", title: "OPENAI_API_KEY не задан", details: "Сгенерирован fallback-отчёт." },
      ];
      recommendations = ["Добавить OPENAI_API_KEY в Vercel → Environment Variables", "Перегенерировать отчёт"];
      top_projects = [...projects].sort((a,b)=>(a.margin??0)-(b.margin??0)).slice(0,5);
      metrics = {
        totals,
        prevTotals: prevTotals || null,
        deltas: prevTotals ? { profit_delta: round2(totals.profit - prevTotals.profit), margin_delta_pp: round2((totals.margin - prevTotals.margin)*100) } : null,
        projects_count: projects.length
      };
    }

    // Красивый текст
    const summary_text = buildSummaryText({
      month,
      totals,
      prevTotals,
      risk_level,
      issues,
      recommendations,
      top_projects
    });

    // Сохраняем
    const metricsToSave = {
      ...metrics,
      month,
      totals,
      prevTotals: prevTotals || null,
      projects_count: projects.length,
      top_projects,
      recommendations,
    };

    const inserted = await sql`
      INSERT INTO ai_reports (period_id, risk_level, summary_text, issues, metrics, created_at)
      VALUES (
        ${period_id},
        ${risk_level},
        ${summary_text},
        ${JSON.stringify(issues)},
        ${JSON.stringify(metricsToSave)},
        NOW()
      )
      RETURNING id
    `;

    const id = inserted?.[0]?.id;

    return res.status(200).json({ ok: true, id, period_id, month, risk_level });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
