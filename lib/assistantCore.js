// lib/assistantCore.js
import { neon } from "@neondatabase/serverless";

const OPENAI_BASE = "https://api.openai.com/v1";

function num(x) { return Number(x || 0); }
function safeStr(x, max = 3000) {
  const s = String(x ?? "");
  return s.length > max ? s.slice(0, max) : s;
}

async function callOpenAIChat({ apiKey, model, messages, temperature = 0.2 }) {
  const r = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature }),
  });

  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch {}

  if (!r.ok) throw new Error(`OpenAI chat HTTP ${r.status}: ${t.slice(0, 500)}`);

  const content = j?.choices?.[0]?.message?.content ?? "";
  return String(content);
}

async function fetchMonthData({ sql, month }) {
  const periodRows = await sql`SELECT id, month FROM periods WHERE month = ${month} LIMIT 1`;
  const period = periodRows?.[0];
  if (!period?.id) throw new Error(`period not found for month=${month}`);
  const period_id = Number(period.id);

  const prevRows = await sql`
    SELECT id, month
    FROM periods
    WHERE month < ${month}
    ORDER BY month DESC
    LIMIT 1
  `;
  const prevPeriod = prevRows?.[0]
    ? { id: Number(prevRows[0].id), month: String(prevRows[0].month) }
    : null;

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

  const projects = rows.map((r) => {
    const revenue = num(r.revenue_no_vat);
    const costs =
      num(r.salary_workers) + num(r.salary_manager) + num(r.salary_head) +
      num(r.ads) + num(r.transport) + num(r.penalties) + num(r.tax);
    const profit = revenue - costs;
    const margin = revenue > 0 ? profit / revenue : 0;

    return {
      project: String(r.project || "—"),
      revenue,
      costs,
      profit,
      margin,
      penalties: num(r.penalties),
      ads: num(r.ads),
      transport: num(r.transport),
      salary_workers: num(r.salary_workers),
      salary_manager: num(r.salary_manager),
      salary_head: num(r.salary_head),
      tax: num(r.tax),
    };
  });

  const totals = projects.reduce(
    (a, p) => {
      a.revenue += num(p.revenue);
      a.costs += num(p.costs);
      a.profit += num(p.profit);
      return a;
    },
    { revenue: 0, costs: 0, profit: 0 }
  );
  totals.margin = totals.revenue > 0 ? totals.profit / totals.revenue : 0;

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

    const prevAgg = prevData.reduce(
      (a, r) => {
        const revenue = num(r.revenue_no_vat);
        const costs =
          num(r.salary_workers) + num(r.salary_manager) + num(r.salary_head) +
          num(r.ads) + num(r.transport) + num(r.penalties) + num(r.tax);
        a.revenue += revenue;
        a.costs += costs;
        a.profit += (revenue - costs);
        return a;
      },
      { revenue: 0, costs: 0, profit: 0 }
    );

    prevTotals = {
      month: prevPeriod.month,
      revenue: prevAgg.revenue,
      costs: prevAgg.costs,
      profit: prevAgg.profit,
      margin: prevAgg.revenue > 0 ? prevAgg.profit / prevAgg.revenue : 0,
    };
  }

  return { period_id, projects, totals, prevTotals };
}

/**
 * Voice-first assistant core: short answers, fast, human-like business tone.
 */
export async function answerAssistantQuestion({ month, question, messages = [] }) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const sql = neon(process.env.DATABASE_URL);
  const { projects, totals, prevTotals } = await fetchMonthData({ sql, month });

  // Keep context small for speed
  const topWorst = [...projects].sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0)).slice(0, 5);
  const topBest = [...projects].sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0)).slice(0, 5);

  const system = {
    role: "system",
    content:
      "Ты финансовый аналитик. Это ГОЛОСОВОЙ диалог для бизнеса. " +
      "Отвечай быстро и живо, как человек: 1–3 коротких предложения, без воды. " +
      "Если нужно — задай ОДИН уточняющий вопрос. " +
      "Числа округляй. Не делай длинных списков. " +
      "Можно использовать связки: “смотри”, “важный момент”, “короче”. " +
      "Если пользователь просит подробно — предложи открыть отчёт/детали.",
  };

  const context = {
    role: "user",
    content:
      `Контекст (месяц ${month}):\n` +
      `totals: ${JSON.stringify(totals)}\n` +
      `prevTotals: ${JSON.stringify(prevTotals || null)}\n` +
      `topWorstByMargin: ${JSON.stringify(topWorst)}\n` +
      `topBestByProfit: ${JSON.stringify(topBest)}\n`,
  };

  const chat = [
    system,
    context,
    ...(Array.isArray(messages) ? messages : []).slice(-6).map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: safeStr(m?.content ?? "", 900),
    })),
    { role: "user", content: safeStr(question, 1800) },
  ];

  const answer = await callOpenAIChat({
    apiKey,
    model: "gpt-4o-mini",
    messages: chat,
    temperature: 0.15,
  });

  return { answer: answer.trim() };
}
