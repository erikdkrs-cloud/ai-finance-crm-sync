import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function getFinancialContext(month) {
  const ctx = { month, projects: [], totals: {}, anomalies: [], reports: [] };

  try {
    const allProjects = await sql`SELECT * FROM projects ORDER BY month DESC, revenue DESC`;

    const filtered = month
      ? allProjects.filter((p) => p.month === month)
      : allProjects;

    ctx.projects = allProjects;
    ctx.filteredProjects = filtered;

    if (filtered.length) {
      const totalRev = filtered.reduce((s, p) => s + Number(p.revenue || 0), 0);
      const totalExp = filtered.reduce((s, p) => s + Number(p.expense || 0), 0);
      const totalProfit = totalRev - totalExp;
      const margin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : 0;
      ctx.totals = { revenue: totalRev, expense: totalExp, profit: totalProfit, margin, count: filtered.length };
    }

    ctx.top3profit = filtered
      .map((p) => ({
        name: p.project_name,
        profit: Number(p.revenue || 0) - Number(p.expense || 0),
        margin: p.revenue > 0 ? (((p.revenue - p.expense) / p.revenue) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3);

    ctx.bottom3 = filtered
      .map((p) => ({
        name: p.project_name,
        profit: Number(p.revenue || 0) - Number(p.expense || 0),
        margin: p.revenue > 0 ? (((p.revenue - p.expense) / p.revenue) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 3);

    const anomalies = await sql`SELECT * FROM anomalies ORDER BY month DESC`;
    ctx.anomalies = month ? anomalies.filter((a) => a.month === month) : anomalies;

    const reports = await sql`SELECT id, month, risk_level, summary_text, created_at FROM reports ORDER BY created_at DESC LIMIT 5`;
    ctx.reports = reports || [];

    const monthsSet = new Set(allProjects.map((p) => p.month).filter(Boolean));
    ctx.availableMonths = [...monthsSet].sort().reverse();

    const byMonth = {};
    allProjects.forEach((p) => {
      const m = p.month || "unknown";
      if (!byMonth[m]) byMonth[m] = { revenue: 0, expense: 0, count: 0 };
      byMonth[m].revenue += Number(p.revenue || 0);
      byMonth[m].expense += Number(p.expense || 0);
      byMonth[m].count++;
    });
    ctx.monthlyTotals = byMonth;
  } catch (e) {
    ctx.error = e.message;
  }

  return ctx;
}

function buildSystemPrompt(ctx, isVoice) {
  const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");

  let prompt = `Ты — J.A.R.V.I.S. (DKRS Edition) — продвинутый AI-ассистент финансовой аналитики.
Твой характер: вежливый, интеллигентный, слегка ироничный, как дворецкий Тони Старка.
Обращайся к пользователю "сэр". Если пользователь попросит обращаться иначе или скажет что он/она девушка — переключись на "мэм".
Можешь вставлять лёгкий юмор в стиле Джарвиса когда уместно.

`;

  if (isVoice) {
    prompt += `ВАЖНО — РЕЖИМ ГОЛОСА:
- Отвечай КОРОТКО и ЧЁТКО — максимум 3-5 предложений
- Не используй markdown форматирование (##, **, - списки)
- Говори как в живом разговоре — просто и понятно
- Цифры округляй до миллионов (вместо "31 156 970" скажи "31 миллион")
- Не перечисляй все проекты — только ключевые 2-3

`;
  } else {
    prompt += `РЕЖИМ ТЕКСТА:
- Давай РАЗВЁРНУТЫЕ ответы с конкретными цифрами
- Используй форматирование: ## заголовки, - списки, **жирный**, эмодзи
- Если спрашивают "что если" — моделируй сценарии с числами
- Давай конкретные рекомендации с приоритетами

`;
  }

  prompt += `ТВОИ ВОЗМОЖНОСТИ:
- Анализ финансовых данных (выручка, расходы, прибыль, маржа)
- Сравнение проектов и периодов
- Выявление рисков и аномалий
- Прогнозирование и моделирование
- Рекомендации по оптимизации
- Ответы на ЛЮБЫЕ вопросы

КРИТИЧЕСКИ ВАЖНО:
- У тебя УЖЕ ЕСТЬ все финансовые данные ниже
- НИКОГДА не проси пользователя предоставить данные
- ВСЕГДА используй цифры из данных ниже
- Отвечай на русском языке
- Будь в образе J.A.R.V.I.S.

`;

  if (ctx.totals?.revenue) {
    prompt += `\n📊 ТЕКУЩИЕ ДАННЫЕ (${ctx.month || "все периоды"}):\n`;
    prompt += `- Общая выручка: ${fmt(ctx.totals.revenue)} ₽\n`;
    prompt += `- Общие расходы: ${fmt(ctx.totals.expense)} ₽\n`;
    prompt += `- Общая прибыль: ${fmt(ctx.totals.profit)} ₽\n`;
    prompt += `- Средняя маржа: ${ctx.totals.margin}%\n`;
    prompt += `- Количество проектов: ${ctx.totals.count}\n`;
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
    prompt += `\n📋 ВСЕ ПРОЕКТЫ (${ctx.projects.length} шт.):\n`;
    ctx.projects.forEach((p) => {
      const profit = Number(p.revenue || 0) - Number(p.expense || 0);
      const margin = p.revenue > 0 ? (((p.revenue - p.expense) / p.revenue) * 100).toFixed(1) : 0;
      prompt += `- ${p.project_name} [${p.month || "—"}]: выр ${fmt(p.revenue)}, расх ${fmt(p.expense)}, приб ${fmt(profit)}, маржа ${margin}%, риск: ${p.risk_level || "—"}\n`;
    });
  }

  if (ctx.anomalies?.length) {
    prompt += `\n🔴 АНОМАЛИИ (${ctx.anomalies.length} шт.):\n`;
    ctx.anomalies.forEach((a) => {
      prompt += `- ${a.project_name} [${a.month || "—"}]: ${a.anomaly_type} — отклонение ${a.deviation}% (${a.direction || ""})\n`;
    });
  }

  if (ctx.reports?.length) {
    prompt += `\n📄 ПОСЛЕДНИЕ ОТЧЁТЫ:\n`;
    ctx.reports.forEach((r) => {
      prompt += `- #${r.id} (${r.month}): риск ${r.risk_level}. ${(r.summary_text || "").slice(0, 200)}\n`;
    });
  }

  if (ctx.availableMonths?.length) {
    prompt += `\n📅 Доступные периоды: ${ctx.availableMonths.join(", ")}\n`;
  }

  if (ctx.monthlyTotals && Object.keys(ctx.monthlyTotals).length > 1) {
    prompt += `\n📅 СВОДКА ПО МЕСЯЦАМ:\n`;
    Object.entries(ctx.monthlyTotals)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([m, d]) => {
        const profit = d.revenue - d.expense;
        const margin = d.revenue > 0 ? ((profit / d.revenue) * 100).toFixed(1) : 0;
        prompt += `- ${m}: выр ${fmt(d.revenue)}, расх ${fmt(d.expense)}, приб ${fmt(profit)}, маржа ${margin}%, проектов: ${d.count}\n`;
      });
  }

  return prompt;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { messages, month, isVoice } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: "messages required" });
  }
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  try {
    const ctx = await getFinancialContext(month);
    const systemPrompt = buildSystemPrompt(ctx, isVoice);

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
        max_tokens: isVoice ? 500 : 4000,
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
