import { SignJWT, jwtVerify } from "jose";

function getSecret() {
  var secret = process.env.AUTH_SECRET || "";
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function parseUsersEnv() {
  var raw = process.env.AUTH_USERS || "[]";
  try {
    var users = JSON.parse(raw);
    return Array.isArray(users) ? users : [];
  } catch (e) {
    return [];
  }
}

export async function createSessionToken({ login, role, userId, name }) {
  var secret = getSecret();
  var payload = { login: login, role: role };
  if (userId) payload.userId = userId;
  if (name) payload.name = name;

  var token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

export async function verifySessionToken(token) {
  var secret = getSecret();
  var result = await jwtVerify(token, secret);
  return result.payload;
}

export function getCookie(req, name) {
  var cookie = (req.headers && req.headers.cookie) ? req.headers.cookie : "";
  var parts = cookie.split(";").map(function (x) { return x.trim(); });
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(name + "=")) {
      return decodeURIComponent(parts[i].slice(name.length + 1));
    }
  }
  return "";
}

export function setCookie(res, name, value, opts) {
  if (!opts) opts = {};
  var httpOnly = opts.httpOnly !== undefined ? opts.httpOnly : true;
  var secure = opts.secure !== undefined ? opts.secure : true;
  var sameSite = opts.sameSite || "Lax";
  var path = opts.path || "/";
  var maxAge = opts.maxAge || 60 * 60 * 24 * 7;

  var parts = [
    name + "=" + encodeURIComponent(value),
    "Path=" + path,
    "Max-Age=" + maxAge,
    "SameSite=" + sameSite,
  ];

  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");

  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearCookie(res, name) {
  res.setHeader(
    "Set-Cookie",
    name + "=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure"
  );
}

export function roleRank(role) {
  if (role === "admin") return 3;
  if (role === "manager") return 2;
  return 1;
}
