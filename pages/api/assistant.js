import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function getFinancialContext(month) {
  const ctx = { month, projects: [], totals: {}, anomalies: [], reports: [] };

  try {
    const projects = month
      ? await sql`SELECT * FROM projects WHERE month = ${month} ORDER BY revenue DESC`
      : await sql`SELECT * FROM projects ORDER BY revenue DESC`;
    ctx.projects = projects || [];

    if (ctx.projects.length) {
      const totalRev = ctx.projects.reduce((s, p) => s + Number(p.revenue || 0), 0);
      const totalExp = ctx.projects.reduce((s, p) => s + Number(p.expense || 0), 0);
      const totalProfit = totalRev - totalExp;
      const margin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : 0;
      ctx.totals = { revenue: totalRev, expense: totalExp, profit: totalProfit, margin, count: ctx.projects.length };

      ctx.top3profit = ctx.projects
        .map((p) => ({
          name: p.project_name,
          profit: Number(p.revenue || 0) - Number(p.expense || 0),
          margin: p.revenue > 0 ? (((p.revenue - p.expense) / p.revenue) * 100).toFixed(1) : 0,
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 3);

      ctx.bottom3 = ctx.projects
        .map((p) => ({
          name: p.project_name,
          profit: Number(p.revenue || 0) - Number(p.expense || 0),
          margin: p.revenue > 0 ? (((p.revenue - p.expense) / p.revenue) * 100).toFixed(1) : 0,
        }))
        .sort((a, b) => a.profit - b.profit)
        .slice(0, 3);
    }

    const anomalies = month
      ? await sql`SELECT * FROM anomalies WHERE month = ${month}`
      : await sql`SELECT * FROM anomalies`;
    ctx.anomalies = anomalies || [];

    const reports = month
      ? await sql`SELECT id, month, risk_level, summary_text, created_at FROM reports WHERE month = ${month} ORDER BY created_at DESC LIMIT 3`
      : await sql`SELECT id, month, risk_level, summary_text, created_at FROM reports ORDER BY created_at DESC LIMIT 3`;
    ctx.reports = reports || [];

    const monthsRes = await sql`SELECT DISTINCT month FROM projects ORDER BY month DESC`;
    ctx.availableMonths = monthsRes.map((m) => m.month);
  } catch (e) {
    ctx.error = e.message;
  }

  return ctx;
}

function buildSystemPrompt(ctx) {
  const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");

  let prompt = `Ты — DKRS AI Финансовый Аналитик. Ты профессиональный, но дружелюбный помощник.

ТВОИ ВОЗМОЖНОСТИ:
- Анализ финансовых данных компании (выручка, расходы, прибыль, маржа)
- Сравнение проектов между собой
- Выявление рисков и аномалий
- Прогнозирование и моделирование ("что если...")
- Рекомендации по оптимизации
- Ответы на ЛЮБЫЕ вопросы — если вопрос не про финансы, отвечай как умный помощник
- Создание примеров с цифрами, расчётами, таблицами

ПРАВИЛА ОТВЕТОВ:
1. Давай РАЗВЁРНУТЫЕ ответы с конкретными цифрами
2. Используй форматирование: заголовки (##), списки (- или 1.), жирный (**текст**), эмодзи
3. Если спрашивают "что если" — моделируй сценарии с числами
4. Сравнивай с прошлыми периодами когда возможно
5. Давай конкретные рекомендации с приоритетами
6. Если данных нет — честно скажи, но предложи что можешь сделать
7. Отвечай на русском языке

`;

  if (ctx.totals?.revenue) {
    prompt += `\n📊 ТЕКУЩИЕ ДАННЫЕ (${ctx.month || "все периоды"}):\n`;
    prompt += `- Выручка: ${fmt(ctx.totals.revenue)} ₽\n`;
    prompt += `- Расходы: ${fmt(ctx.totals.expense)} ₽\n`;
    prompt += `- Прибыль: ${fmt(ctx.totals.profit)} ₽\n`;
    prompt += `- Маржа: ${ctx.totals.margin}%\n`;
    prompt += `- Проектов: ${ctx.totals.count}\n`;
  }

  if (ctx.top3profit?.length) {
    prompt += `\n🏆 ТОП-3 по прибыли:\n`;
    ctx.top3profit.forEach((p, i) => {
      prompt += `${i + 1}. ${p.name} — прибыль ${fmt(p.profit)} ₽, маржа ${p.margin}%\n`;
    });
  }

  if (ctx.bottom3?.length) {
    prompt += `\n⚠️ Худшие 3 проекта:\n`;
    ctx.bottom3.forEach((p, i) => {
      prompt += `${i + 1}. ${p.name} — прибыль ${fmt(p.profit)} ₽, маржа ${p.margin}%\n`;
    });
  }

  if (ctx.projects?.length) {
    prompt += `\n📋 ВСЕ ПРОЕКТЫ:\n`;
    ctx.projects.forEach((p) => {
      const profit = Number(p.revenue || 0) - Number(p.expense || 0);
      const margin = p.revenue > 0 ? (((p.revenue - p.expense) / p.revenue) * 100).toFixed(1) : 0;
      prompt += `- ${p.project_name}: выручка ${fmt(p.revenue)}, расход ${fmt(p.expense)}, прибыль ${fmt(profit)}, маржа ${margin}%, риск: ${p.risk_level || "—"}\n`;
    });
  }

  if (ctx.anomalies?.length) {
    prompt += `\n🔴 АНОМАЛИИ:\n`;
    ctx.anomalies.forEach((a) => {
      prompt += `- ${a.project_name}: ${a.anomaly_type} — отклонение ${a.deviation}% (${a.direction || ""})\n`;
    });
  }

  if (ctx.reports?.length) {
    prompt += `\n📄 ПОСЛЕДНИЕ ОТЧЁТЫ:\n`;
    ctx.reports.forEach((r) => {
      prompt += `- Отчёт #${r.id} (${r.month}): риск ${r.risk_level}. ${(r.summary_text || "").slice(0, 200)}\n`;
    });
  }

  if (ctx.availableMonths?.length) {
    prompt += `\nДоступные периоды: ${ctx.availableMonths.join(", ")}\n`;
  }

  return prompt;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { messages, month } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: "messages required" });
  }
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  try {
    const ctx = await getFinancialContext(month);
    const systemPrompt = buildSystemPrompt(ctx);

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-20).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Нет ответа от AI";

    return res.status(200).json({ ok: true, reply, usage: data.usage });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
