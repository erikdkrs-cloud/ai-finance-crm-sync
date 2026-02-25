import { neon } from "@neondatabase/serverless";

function num(x) { return Number(x || 0); }
function round2(x) { return Math.round(num(x) * 100) / 100; }
function round4(x) { return Math.round(num(x) * 10000) / 10000; }

function computeRiskFromProjects(projects) {
  // общий риск: если есть red → red, иначе если есть yellow → yellow, иначе green
  if (projects.some(p => p.risk === "red")) return "red";
  if (projects.some(p => p.risk === "yellow")) return "yellow";
  return "green";
}

function buildFallbackReport({ month, totals, projects }) {
  const issues = [];

  // простые правила как в твоём анализе
  if (totals.revenue > 0 && totals.margin < 0.10) issues.push({ severity: "high", title: "Низкая маржа", details: "Маржа < 10%" });
  else if (totals.revenue > 0 && totals.margin < 0.20) issues.push({ severity: "medium", title: "Маржа ниже нормы", details: "Маржа < 20%" });

  const withPenalties = projects.filter(p => p.penalties > 0);
  if (withPenalties.length) issues.push({ severity: "medium", title: "Есть штрафы", details: `Проектов со штрафами: ${withPenalties.length}` });

  const worst = [...projects].sort((a,b)=> (a.margin ?? 0) - (b.margin ?? 0)).slice(0, 3);
  if (worst.length) issues.push({
    severity: "medium",
    title: "Худшие по марже проекты",
    details: worst.map(p => `${p.project}: ${(p.margin*100).toFixed(1)}%`).join(", ")
  });

  const risk_level = computeRiskFromProjects(projects);

  const summary_text =
`Месяц: ${month}
Выручка: ${totals.revenue.toLocaleString("ru-RU")}
Расходы: ${totals.costs.toLocaleString("ru-RU")}
Прибыль: ${totals.profit.toLocaleString("ru-RU")}
Маржа: ${(totals.margin*100).toFixed(1)}%
Риск: ${risk_level}

Ключевые замечания:
- ${issues.map(i => i.title).join("\n- ") || "Нет явных проблем по правилам MVP."}
`;

  const metrics = {
    month,
    totals,
    projects_count: projects.length,
    risk_level
  };

  return { risk_level, summary_text, issues, metrics };
}

async function callOpenAI({ apiKey, month, totals, projects }) {
  // Небольшой, стабильный вызов через fetch (без SDK)
  const prompt = `
Ты финансовый аналитик. Сгенерируй краткий отчёт за месяц ${month}.
Дай:
1) risk_level: "green" | "yellow" | "red"
2) summary_text: текст (5-12 строк)
3) issues: массив объектов {severity: "high"|"medium"|"low", title: string, details: string}
4) metrics: объект (можно продублировать totals, топ-3 худших проектов)

Данные totals:
${JSON.stringify(totals)}

Данные по проектам:
${JSON.stringify(projects)}

Правила риска:
- если общая маржа < 10% → red
- если общая маржа < 20% → yellow
- если есть штрафы / сильные проблемы → минимум yellow
Ответ верни СТРОГО в JSON, без markdown и без комментариев.
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
        { role: "system", content: "Ты аккуратно выдаёшь только валидный JSON без обёрток." },
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
  // пытаемся распарсить JSON
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI вернул не-JSON: " + content.slice(0, 200));
  }

  // минимальная валидация
  if (!parsed?.risk_level || !parsed?.summary_text) {
    throw new Error("OpenAI JSON без risk_level/summary_text");
  }

  return parsed;
}

export default async function handler(req, res) {
  // allow GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, method: req.method });
  }

  const sql = neon(process.env.DATABASE_URL);

  const month = String(req.query?.month || "").trim();
  if (!month) {
    return res.status(400).json({ ok: false, error: "month query param required (YYYY-MM)" });
  }

  try {
    // 1) find period_id
    const periodRows = await sql`
      SELECT id, month
      FROM periods
      WHERE month = ${month}
      LIMIT 1
    `;
    const period = periodRows?.[0];
    if (!period?.id) {
      return res.status(404).json({ ok: false, error: `period not found for month=${month}` });
    }

    const period_id = Number(period.id);

    // 2) load financial rows for that month
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
      const labor = num(r.salary_workers);

      const costs =
        num(r.salary_workers) + num(r.salary_manager) + num(r.salary_head) +
        num(r.ads) + num(r.transport) + num(r.penalties) + num(r.tax);

      const profit = revenue - costs;
      const margin = revenue > 0 ? profit / revenue : 0;

      let risk = "green";
      if (revenue > 0 && margin < 0.1) risk = "red";
      else if (revenue > 0 && margin < 0.2) risk = "yellow";
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
        labor: round2(labor)
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

    // 3) build report: try OpenAI, fallback if needed
    const apiKey = process.env.OPENAI_API_KEY || "";
    let report;

    if (apiKey) {
      try {
        report = await callOpenAI({ apiKey, month, totals, projects });
      } catch (e) {
        // если OpenAI упал — делаем fallback, но не ломаем весь процесс
        report = buildFallbackReport({ month, totals, projects });
        report.summary_text =
          report.summary_text +
          `\n\n(Примечание: OpenAI не сработал, использован fallback. Причина: ${String(e).slice(0, 200)})`;
      }
    } else {
      report = buildFallbackReport({ month, totals, projects });
      report.summary_text =
        report.summary_text +
        `\n\n(Примечание: OPENAI_API_KEY не задан, использован fallback.)`;
    }

    // 4) save to ai_reports
    const risk_level = String(report.risk_level || computeRiskFromProjects(projects));
    const summary_text = String(report.summary_text || "");
    const issues = report.issues ?? [];
    const metrics = report.metrics ?? { month, totals };

    const inserted = await sql`
      INSERT INTO ai_reports (period_id, risk_level, summary_text, issues, metrics, created_at)
      VALUES (${period_id}, ${risk_level}, ${summary_text}, ${issues}, ${metrics}, NOW())
      RETURNING id
    `;

    const id = inserted?.[0]?.id;

    return res.status(200).json({ ok: true, id, period_id, month, risk_level });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
