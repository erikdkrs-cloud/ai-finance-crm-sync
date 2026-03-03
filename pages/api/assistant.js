// pages/api/assistant.js
import { answerAssistantQuestion } from "../../lib/assistantCore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { month, question, messages } = req.body || {};
    if (!/^\d{4}-\d{2}$/.test(String(month || ""))) {
      return res.status(400).json({ ok: false, error: "month must be YYYY-MM" });
    }
    if (!question || !String(question).trim()) {
      return res.status(400).json({ ok: false, error: "question is required" });
    }

    const r = await answerAssistantQuestion({
      month: String(month),
      question: String(question),
      messages: Array.isArray(messages) ? messages : [],
    });

    return res.status(200).json({ ok: true, answer: r.answer });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
