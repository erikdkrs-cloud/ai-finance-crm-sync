import { neon } from "@neondatabase/serverless";

function num(x) { return Number(x || 0); }
function round2(x){ return Math.round(num(x) * 100) / 100; }
function round4(x){ return Math.round(num(x) * 10000) / 10000; }

async function openaiChat({ apiKey, body }) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}: ${text.slice(0, 500)}`);

  let j;
  try { j = JSON.parse(text); }
  catch { throw new Error("OpenAI вернул не-JSON ответ: " + text.slice(0, 300)); }

  return j;
}

/** ===== DB helpers ===== */

async function dbGetMonths(sql) {
  const rows = await sql`SELECT month FROM periods ORDER BY month DESC`;
  return (rows || []).map(r => String(r.month));
}

async function dbGetMonthData(sql, month) {
  const periodRows = await sql`SELECT id, month FROM periods WHERE month = ${month} LIMIT 1`;
  const period = periodRows?.[0];
  if (!period?.id) throw new Error(`period not found for month=${month}`);
  const period_id = Number(period.id);

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

  const projects = (rows || []).map(r => {
    const revenue = num(r.revenue_no_vat);
    const costs =
      num(r.salary_workers) + num(r.salary_manager) + num(r.salary_head) +
      num(r.ads) + num(r.transport) + num(r.penalties) + num(r.tax);

    const profit = revenue - costs;
    const margin = revenue > 0 ? profit / revenue : 0;

    // небольшой risk-эвристик (не обязателен, но полезен ассистенту)
    let risk = "green";
    if (revenue > 0 && margin < 0.10) risk = "red";
    else if (revenue > 0 && margin < 0.20) risk = "yellow";
    if (num(r.penalties) > 0 && risk === "green") risk = "yellow";

    return {
      project_name: String(r.project),
      revenue: round2(revenue),
      costs: round2(costs),
      profit: round2(profit),
      margin: round4(margin),
      risk_level: risk,

      penalties: round2(num(r.penalties)),
      ads: round2(num(r.ads)),
      transport: round2(num(r.transport)),
      salary_workers: round2(num(r.salary_workers)),
      team_payroll: round2(num(r.salary_workers) + num(r.salary_manager) + num(r.salary_head)),
      tax: round2(num(r.tax)),
    };
  });

  const totalsAgg = projects.reduce((a, p) => {
    a.revenue += num(p.revenue);
    a.costs += num(p.costs);
    a.profit += num(p.profit);
    return a;
  }, { revenue: 0, costs: 0, profit: 0 });

  const totals = {
    revenue: round2(totalsAgg.revenue),
    costs: round2(totalsAgg.costs),
    profit: round2(totalsAgg.profit),
    margin: round4(totalsAgg.revenue > 0 ? totalsAgg.profit / totalsAgg.revenue : 0),
    projects_count: projects.length,
  };

  return { month, period_id, totals, projects };
}

async function dbGetTotalsRange(sql, fromMonth, toMonth) {
  // отдаем агрегаты по месяцам (в диапазоне)
  const rows = await sql`
    SELECT
      p.month AS month,
      SUM(fr.revenue_no_vat) AS revenue,
      SUM(fr.salary_workers + fr.salary_manager + fr.salary_head + fr.ads + fr.transport + fr.penalties + fr.tax) AS costs
    FROM financial_rows fr
    JOIN periods p ON p.id = fr.period_id
    WHERE p.month >= ${fromMonth} AND p.month <= ${toMonth}
    GROUP BY p.month
    ORDER BY p.month
  `;

  return (rows || []).map(r => {
    const revenue = num(r.revenue);
    const costs = num(r.costs);
    const profit = revenue - costs;
    const margin = revenue > 0 ? profit / revenue : 0;
    return {
      month: String(r.month),
      revenue: round2(revenue),
      costs: round2(costs),
      profit: round2(profit),
      margin: round4(margin),
    };
  });
}

async function dbGetProjectSeries(sql, projectName, fromMonth, toMonth) {
  const rows = await sql`
    SELECT
      p.month AS month,
      SUM(fr.revenue_no_vat) AS revenue,
      SUM(fr.salary_workers + fr.salary_manager + fr.salary_head + fr.ads + fr.transport + fr.penalties + fr.tax) AS costs
    FROM financial_rows fr
    JOIN periods p ON p.id = fr.period_id
    JOIN projects pr ON pr.id = fr.project_id
    WHERE p.month >= ${fromMonth} AND p.month <= ${toMonth}
      AND pr.name = ${projectName}
    GROUP BY p.month
    ORDER BY p.month
  `;

  return (rows || []).map(r => {
    const revenue = num(r.revenue);
    const costs = num(r.costs);
    const profit = revenue - costs;
    const margin = revenue > 0 ? profit / revenue : 0;
    return {
      month: String(r.month),
      revenue: round2(revenue),
      costs: round2(costs),
      profit: round2(profit),
      margin: round4(margin),
    };
  });
}

/** ===== Main handler ===== */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });

  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return res.status(500).json({ ok: false, error: "OPENAI_API_KEY is not set" });

  const sql = neon(process.env.DATABASE_URL);

  const { month, question, messages } = req.body || {};
  const baseMonth = String(month || "").trim();
  const q = String(question || "").trim();

  if (!/^\d{4}-\d{2}$/.test(baseMonth)) {
    return res.status(400).json({ ok: false, error: `month must be YYYY-MM, got: "${baseMonth}"` });
  }
  if (!q) return res.status(400).json({ ok: false, error: "question required" });
  if (q.length > 1200) return res.status(400).json({ ok: false, error: "question too long" });

  const history = Array.isArray(messages) ? messages.slice(-10) : []; // максимум 10 последних

  const tools = [
    {
      type: "function",
      function: {
        name: "get_months",
        description: "Вернуть список доступных месяцев (YYYY-MM), отсортированный от новых к старым.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "get_month_data",
        description: "Вернуть агрегаты и проекты за конкретный месяц.",
        parameters: {
          type: "object",
          properties: {
            month: { type: "string", description: "YYYY-MM" }
          },
          required: ["month"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_totals_range",
        description: "Вернуть totals по каждому месяцу в диапазоне (включительно). Подходит для квартала/периода.",
        parameters: {
          type: "object",
          properties: {
            from_month: { type: "string", description: "YYYY-MM" },
            to_month: { type: "string", description: "YYYY-MM" }
          },
          required: ["from_month", "to_month"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_project_series",
        description: "Динамика одного проекта по месяцам в диапазоне (выручка/расходы/прибыль/маржа).",
        parameters: {
          type: "object",
          properties: {
            project_name: { type: "string" },
            from_month: { type: "string", description: "YYYY-MM" },
            to_month: { type: "string", description: "YYYY-MM" }
          },
          required: ["project_name", "from_month", "to_month"]
        }
      }
    }
  ];

  const system = `
Ты — финансовый AI-аналитик для AI Finance CRM.
Отвечай по-русски, кратко и по делу.
Всегда указывай конкретные месяцы (YYYY-MM) и опирайся на цифры из данных.
Если данных недостаточно — уточни, какой период/проект нужен.

Тебе доступны инструменты (functions) для получения данных из базы:
- get_months
- get_month_data
- get_totals_range
- get_project_series

Важно:
- НЕ выдумывай цифры.
- Если пользователь просит "квартал", выясни квартал по месяцам или уточни период.
`.trim();

  // Собираем сообщения
  const chatMessages = [
    { role: "system", content: system },
    ...history.filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"),
    {
      role: "user",
      content: `Базовый выбранный месяц на дашборде: ${baseMonth}\nВопрос: ${q}`
    }
  ];

  // tool-calling loop (до 3 шагов)
  try {
    let toolMessages = [...chatMessages];

    for (let step = 0; step < 3; step++) {
      const resp = await openaiChat({
        apiKey,
        body: {
          model: "gpt-4o-mini",
          messages: toolMessages,
          tools,
          temperature: 0.2,
        }
      });

      const msg = resp?.choices?.[0]?.message;
      const toolCalls = msg?.tool_calls;

      // Если модель решила просто ответить
      if (!toolCalls || toolCalls.length === 0) {
        const answer = String(msg?.content || "").trim();
        return res.status(200).json({ ok: true, answer: answer || "Не смог сформировать ответ. Попробуй переформулировать вопрос." });
      }

      // Иначе выполняем tool calls
      toolMessages.push({
        role: "assistant",
        content: msg?.content || "",
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const name = tc?.function?.name;
        let args = {};
        try { args = JSON.parse(tc?.function?.arguments || "{}"); } catch {}

        let result = null;

        if (name === "get_months") {
          result = await dbGetMonths(sql);
        } else if (name === "get_month_data") {
          const m = String(args.month || "").trim();
          if (!/^\d{4}-\d{2}$/.test(m)) throw new Error(`bad month: ${m}`);
          result = await dbGetMonthData(sql, m);
        } else if (name === "get_totals_range") {
          const fm = String(args.from_month || "").trim();
          const tm = String(args.to_month || "").trim();
          if (!/^\d{4}-\d{2}$/.test(fm) || !/^\d{4}-\d{2}$/.test(tm)) throw new Error("bad range months");
          result = await dbGetTotalsRange(sql, fm, tm);
        } else if (name === "get_project_series") {
          const pn = String(args.project_name || "").trim();
          const fm = String(args.from_month || "").trim();
          const tm = String(args.to_month || "").trim();
          if (!pn) throw new Error("project_name required");
          if (!/^\d{4}-\d{2}$/.test(fm) || !/^\d{4}-\d{2}$/.test(tm)) throw new Error("bad range months");
          result = await dbGetProjectSeries(sql, pn, fm, tm);
        } else {
          result = { error: `Unknown tool: ${name}` };
        }

        toolMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return res.status(200).json({ ok: true, answer: "Сделал слишком много шагов. Сузь вопрос или уточни период/проект." });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
