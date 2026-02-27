import { clearCookie } from "../../../lib/auth";

export default function handler(req, res) {
  clearCookie(res, "ai_finance_session");
  return res.status(200).json({ ok: true });
}
