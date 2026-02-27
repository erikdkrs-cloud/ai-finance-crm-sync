import { SignJWT, jwtVerify } from "jose";

function getSecret() {
  const secret = process.env.AUTH_SECRET || "";
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function parseUsersEnv() {
  const raw = process.env.AUTH_USERS || "[]";
  try {
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

export async function createSessionToken({ login, role }) {
  const secret = getSecret();

  const token = await new SignJWT({ login, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

export async function verifySessionToken(token) {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload; // { login, role, iat, exp }
}

export function getCookie(req, name) {
  const cookie = req.headers?.cookie || "";
  const parts = cookie.split(";").map((x) => x.trim());
  for (const p of parts) {
    if (p.startsWith(name + "=")) {
      return decodeURIComponent(p.slice(name.length + 1));
    }
  }
  return "";
}

export function setCookie(res, name, value, opts = {}) {
  const {
    httpOnly = true,
    secure = true,
    sameSite = "Lax",
    path = "/",
    maxAge = 60 * 60 * 24 * 7, // 7 days
  } = opts;

  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    `SameSite=${sameSite}`,
  ];

  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");

  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearCookie(res, name) {
  res.setHeader(
    "Set-Cookie",
    `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure`
  );
}

export function roleRank(role) {
  if (role === "admin") return 3;
  if (role === "manager") return 2;
  return 1; // viewer
}
