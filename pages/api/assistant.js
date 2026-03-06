import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function getFinancialContext(month) {
  const ctx = { month, projects: [], totals: {}, issues: [], reports: [] };

  try {
    const periods = await sql`SELECT id, month FROM periods ORDER BY id DESC`;
    ctx.availableMonths = periods.map((p) => ({ id: p.id, month: p.month }));

    let periodId = null;
    if (month) {
      const found = periods.find((p) => p.month === month || p.id.toString() === month);
      if (found) periodId = found.id;
    }

    const allData = await sql`SELECT * FROM v_financial_calc ORDER BY revenue_no_vat DESC`;
    ctx.allProjects = allData;

    const filtered = month ? allData.filter((p) => p.month === month) : allData;
    ctx.projects = filtered;

    if (filtered.length) {
      const totalRev = filtered.reduce((s, p) => s + Number(p.revenue_no_vat || 0), 0);
      const totalExpense = filtered.reduce((s, p) => {
        return s + Number(p.salary_workers || 0) + Number(p.salary_manager || 0) +
          Number(p.salary_head || 0) + Number(p.ads || 0) + Number(p.transport || 0) +
          Number(p.penalties || 0) + Number(p.tax || 0);
      }, 0);
      const totalProfit = filtered.reduce((s, p) => s + Number(p.profit || 0), 0);
      const margin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : 0;
      ctx.totals = { revenue: totalRev, expense: totalExpense, profit: totalProfit, margin, count: filtered.length };
    }

    ctx.top3 = [...filtered].sort((a, b) => Number(b.profit || 0) - Number(a.profit || 0)).slice(0, 3);
    ctx.bottom3 = [...filtered].sort((a, b) => Number(a.profit || 0) - Number(b.profit || 0)).slice(0, 3);

    const reports = periodId
      ? await sql`SELECT * FROM ai_reports WHERE period_id = ${periodId} ORDER BY created_at DESC LIMIT 3`
      : await sql`SELECT * FROM ai_reports ORDER BY created_at DESC LIMIT 3`;
    ctx.reports = reports || [];

    const allIssues = [];
    reports.forEach((r) => {
      if (r.issues && Array.isArray(r.issues)) {
        r.issues.forEach((iss) => allIssues.push({ ...iss, report_id: r.id, risk_level: r.risk_level }));
      }
    });
    ctx.issues = allIssues;

    const byMonth = {};
    allData.forEach((p) => {
      const m = p.month || "unknown";
      if (!byMonth[m]) byMonth[m] = { revenue: 0, expense: 0, profit: 0, count: 0 };
      byMonth[m].revenue += Number(p.revenue_no_vat || 0);
      byMonth[m].profit += Number(p.profit || 0);
      byMonth[m].expense += Number(p.salary_workers || 0) + Number(p.salary_manager || 0) +
        Number(p.salary_head || 0) + Number(p.ads || 0) + Number(p.transport || 0) +
        Number(p.penalties || 0) + Number(p.tax || 0);
      byMonth[m].count++;
    });
    ctx.monthlyTotals = byMonth;
  } catch (e) {
    ctx.error = e.message;
  }

  return ctx;
}

function buildSystemPrompt(ctx, isVoice, greeting) {
  const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");
  const pct = (n) => (Number(n || 0) * 100).toFixed(1);

  const greetingMap = {
    sir: 'Обращайся к пользователю "сэр". Пользователь — мужчина.',
    mam: 'Обращайся к пользователю "мэм". Пользователь — женщина.',
    boss: 'Обращайся к пользователю "босс". Пол не важен.',
    name: 'Обращайся к пользователю по имени, если он его назовёт. Пока — просто вежливо без обращения.',
    neutral: 'Не используй обращения "сэр" или "мэм". Говори нейтрально и вежливо.',
  };

  let prompt = `Ты — J.A.R.V.I.S. (DKRS Edition) — продвинутый AI-ассистент финансовой аналитики.
Твой характер: вежливый, интеллигентный, слегка ироничный, как дворецкий Тони Старка.
${greetingMap[greeting] || greetingMap.sir}
Можешь вставлять лёгкий юмор в стиле Джарвиса когда уместно.

`;

  if (isVoice) {
    prompt += `ВАЖНО — РЕЖИМ ГОЛОСА:
- Отвечай КОРОТКО — максимум 3-5 предложений
- Не используй markdown (##, **, - списки)
- Говори просто и понятно, как в разговоре
- Цифры округляй (вместо "1 221 697" скажи "1.2 миллиона")
- Упоминай только ключевые 2-3 проекта

`;
  } else {
    prompt += `РЕЖИМ ТЕКСТА:
- Давай РАЗВЁРНУТЫЕ ответы с конкретными цифрами
- Используй форматирование: ## заголовки, - списки, **жирный**, эмодзи
- Моделируй сценарии "что если" с числами
- Давай рекомендации с приоритетами

`;
  }

  prompt += `КРИТИЧЕСКИ ВАЖНО:
- У тебя УЖЕ ЕСТЬ все финансовые данные ниже
- НИКОГДА не проси пользователя предоставить данные
- ВСЕГДА используй реальные цифры и названия проектов
- Отвечай на русском языке

СТРУКТУРА РАСХОДОВ:
- salary_workers — зарплата подработчиков
- salary_manager — зарплата менеджера
- salary_head — зарплата руководителя
- ads — реклама
- transport — транспорт
- penalties — штрафы
- tax — налоги

`;

  if (ctx.totals?.revenue) {
    prompt += `\n📊 ИТОГИ (${ctx.month || "все периоды"}):\n`;
    prompt += `- Выручка (без НДС): ${fmt(ctx.totals.revenue)} ₽\n`;
    prompt += `- Расходы: ${fmt(ctx.totals.expense)} ₽\n`;
    prompt += `- Прибыль: ${fmt(ctx.totals.profit)} ₽\n`;
    prompt += `- Маржа: ${ctx.totals.margin}%\n`;
    prompt += `- Проектов: ${ctx.totals.count}\n`;
  }

  if (ctx.top3?.length) {
    prompt += `\n🏆 ТОП-3:\n`;
    ctx.top3.forEach((p, i) => {
      prompt += `${i + 1}. ${p.project} — выр ${fmt(p.revenue_no_vat)} ₽, приб ${fmt(p.profit)} ₽, маржа ${pct(p.margin)}%\n`;
    });
  }

  if (ctx.bottom3?.length) {
    prompt += `\n⚠️ Худшие 3:\n`;
    ctx.bottom3.forEach((p, i) => {
      prompt += `${i + 1}. ${p.project} — выр ${fmt(p.revenue_no_vat)} ₽, приб ${fmt(p.profit)} ₽, маржа ${pct(p.margin)}%\n`;
    });
  }

  if (ctx.projects?.length) {
    prompt += `\n📋 ВСЕ ПРОЕКТЫ (${ctx.projects.length} шт.):\n`;
    ctx.projects.forEach((p) => {
      prompt += `- ${p.project} [${p.month || "—"}]: выр ${fmt(p.revenue_no_vat)}, ЗПподр ${fmt(p.salary_workers)}, ЗПмен ${fmt(p.salary_manager)}, ЗПрук ${fmt(p.salary_head)}, рекл ${fmt(p.ads)}, трансп ${fmt(p.transport)}, штрафы ${fmt(p.penalties)}, налог ${fmt(p.tax)}, приб ${fmt(p.profit)}, маржа ${pct(p.margin)}%\n`;
    });
  }

  if (ctx.issues?.length) {
    prompt += `\n🔴 ПРОБЛЕМЫ (${ctx.issues.length}):\n`;
    ctx.issues.forEach((iss) => {
      prompt += `- ${iss.project}: ${iss.msg} [${iss.severity}]\n`;
    });
  }

  if (ctx.reports?.length) {
    prompt += `\n📄 AI ОТЧЁТЫ:\n`;
    ctx.reports.forEach((r) => {
      prompt += `- #${r.id}: риск ${r.risk_level}. ${(r.summary_text || "").slice(0, 300)}\n`;
    });
  }

  if (ctx.monthlyTotals && Object.keys(ctx.monthlyTotals).length > 1) {
    prompt += `\n📅 ПО МЕСЯЦАМ:\n`;
    Object.entries(ctx.monthlyTotals).sort(([a], [b]) => b.localeCompare(a)).forEach(([m, d]) => {
      const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : 0;
      prompt += `- ${m}: выр ${fmt(d.revenue)}, расх ${fmt(d.expense)}, приб ${fmt(d.profit)}, маржа ${margin}%, проектов ${d.count}\n`;
    });
  }

  if (ctx.availableMonths?.length) {
    prompt += `\n📅 Периоды: ${ctx.availableMonths.map((m) => m.month).join(", ")}\n`;
  }

  return prompt;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { messages, month, isVoice, greeting } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "messages required" });
  if (!OPENAI_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not configured" });

  try {
    const ctx = await getFinancialContext(month);
    const systemPrompt = buildSystemPrompt(ctx, isVoice, greeting || "sir");

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-20).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: apiMessages, temperature: 0.7, max_tokens: isVoice ? 500 : 4000 }),
    });

    if (!response.ok) { const err = await response.text(); throw new Error(`OpenAI: ${response.status} — ${err}`); }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Нет ответа";
    return res.status(200).json({ ok: true, reply, usage: data.usage });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
