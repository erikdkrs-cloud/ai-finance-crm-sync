import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function getFinancialContext(month) {
  const ctx = { month, projects: [], totals: {}, issues: [], reports: [] };

  try {
    // 1. Все периоды
    const periods = await sql`SELECT id, month FROM periods ORDER BY id DESC`;
    ctx.availableMonths = periods.map((p) => ({ id: p.id, month: p.month }));

    // Определяем period_id по выбранному месяцу
    let periodId = null;
    if (month) {
      const found = periods.find((p) => p.month === month || p.id.toString() === month);
      if (found) periodId = found.id;
    }

    // 2. Финансовые данные из VIEW
    const allData = await sql`SELECT * FROM v_financial_calc ORDER BY revenue_no_vat DESC`;
    ctx.allProjects = allData;

    const filtered = month
      ? allData.filter((p) => p.month === month)
      : allData;
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

      ctx.totals = {
        revenue: totalRev,
        expense: totalExpense,
        profit: totalProfit,
        margin,
        count: filtered.length,
      };
    }

    // 3. Top / Bottom проекты
    ctx.top3 = [...filtered]
      .sort((a, b) => Number(b.profit || 0) - Number(a.profit || 0))
      .slice(0, 3);

    ctx.bottom3 = [...filtered]
      .sort((a, b) => Number(a.profit || 0) - Number(b.profit || 0))
      .slice(0, 3);

    // 4. AI отчёты + issues (вместо anomalies)
    const reports = periodId
      ? await sql`SELECT * FROM ai_reports WHERE period_id = ${periodId} ORDER BY created_at DESC LIMIT 3`
      : await sql`SELECT * FROM ai_reports ORDER BY created_at DESC LIMIT 3`;
    ctx.reports = reports || [];

    // Извлекаем issues из отчётов
    const allIssues = [];
    reports.forEach((r) => {
      if (r.issues && Array.isArray(r.issues)) {
        r.issues.forEach((iss) => {
          allIssues.push({ ...iss, report_id: r.id, risk_level: r.risk_level });
        });
      }
    });
    ctx.issues = allIssues;

    // 5. Агрегация по месяцам для сравнения
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

function buildSystemPrompt(ctx, isVoice) {
  const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");
  const pct = (n) => (Number(n || 0) * 100).toFixed(1);

  let prompt = `Ты — J.A.R.V.I.S. (DKRS Edition) — продвинутый AI-ассистент финансовой аналитики.
Твой характер: вежливый, интеллигентный, слегка ироничный, как дворецкий Тони Старка.
Обращайся к пользователю "сэр". Если пользователь попросит обращаться иначе или скажет что он/она девушка — переключись на "мэм".
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
- ВСЕГДА используй реальные цифры и названия проектов из данных
- Отвечай на русском языке

СТРУКТУРА РАСХОДОВ каждого проекта:
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
    prompt += `\n🏆 ТОП-3 по прибыли:\n`;
    ctx.top3.forEach((p, i) => {
      prompt += `${i + 1}. ${p.project} — выручка ${fmt(p.revenue_no_vat)} ₽, прибыль ${fmt(p.profit)} ₽, маржа ${pct(p.margin)}%\n`;
    });
  }

  if (ctx.bottom3?.length) {
    prompt += `\n⚠️ Худшие 3 проекта:\n`;
    ctx.bottom3.forEach((p, i) => {
      prompt += `${i + 1}. ${p.project} — выручка ${fmt(p.revenue_no_vat)} ₽, прибыль ${fmt(p.profit)} ₽, маржа ${pct(p.margin)}%\n`;
    });
  }

  if (ctx.projects?.length) {
    prompt += `\n📋 ВСЕ ПРОЕКТЫ (${ctx.projects.length} шт.):\n`;
    ctx.projects.forEach((p) => {
      prompt += `- ${p.project} [${p.month || "—"}]: выручка ${fmt(p.revenue_no_vat)} ₽, `;
      prompt += `ЗП подр. ${fmt(p.salary_workers)} ₽, ЗП менедж. ${fmt(p.salary_manager)} ₽, `;
      prompt += `ЗП рук. ${fmt(p.salary_head)} ₽, реклама ${fmt(p.ads)} ₽, `;
      prompt += `транспорт ${fmt(p.transport)} ₽, штрафы ${fmt(p.penalties)} ₽, налог ${fmt(p.tax)} ₽, `;
      prompt += `прибыль ${fmt(p.profit)} ₽, маржа ${pct(p.margin)}%\n`;
    });
  }

  if (ctx.issues?.length) {
    prompt += `\n🔴 ПРОБЛЕМЫ И РИСКИ (${ctx.issues.length} шт.):\n`;
    ctx.issues.forEach((iss) => {
      prompt += `- ${iss.project}: ${iss.msg} [${iss.severity}]\n`;
    });
  }

  if (ctx.reports?.length) {
    prompt += `\n📄 AI ОТЧЁТЫ:\n`;
    ctx.reports.forEach((r) => {
      prompt += `- Отчёт #${r.id}: риск ${r.risk_level}. ${(r.summary_text || "").slice(0, 300)}\n`;
    });
  }

  if (ctx.monthlyTotals && Object.keys(ctx.monthlyTotals).length > 1) {
    prompt += `\n📅 СВОДКА ПО МЕСЯЦАМ:\n`;
    Object.entries(ctx.monthlyTotals)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([m, d]) => {
        const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : 0;
        prompt += `- ${m}: выручка ${fmt(d.revenue)} ₽, расход ${fmt(d.expense)} ₽, прибыль ${fmt(d.profit)} ₽, маржа ${margin}%, проектов: ${d.count}\n`;
      });
  }

  if (ctx.availableMonths?.length) {
    prompt += `\n📅 Доступные периоды: ${ctx.availableMonths.map((m) => m.month).join(", ")}\n`;
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
