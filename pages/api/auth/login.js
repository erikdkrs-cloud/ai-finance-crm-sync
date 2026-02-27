import { createSessionToken, parseUsersEnv, setCookie } from "../../../lib/auth";

function safeEqual(a, b) {
  // простая защита от тривиального timing
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ ok: false, error: "login and password required" });

  const users = parseUsersEnv();
  const user = users.find((u) => String(u.login) === String(login));

  if (!user || !safeEqual(String(user.password || ""), String(password))) {
    return res.status(401).json({ ok: false, error: "Неверный логин или пароль" });
  }

  const role = String(user.role || "viewer");
  const token = await createSessionToken({ login: String(login), role });

  setCookie(res, "ai_finance_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res.status(200).json({ ok: true, login: String(login), role });
}
