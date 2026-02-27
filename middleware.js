import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

function roleRank(role) {
  if (role === "admin") return 3;
  if (role === "manager") return 2;
  return 1; // viewer
}

async function verify(token) {
  const secret = process.env.AUTH_SECRET || "";
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload; // { login, role }
}

function getCookie(req, name) {
  const cookie = req.headers.get("cookie") || "";
  const parts = cookie.split(";").map((x) => x.trim());
  for (const p of parts) {
    if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
  }
  return "";
}

// Настройка прав на API
function requiredRoleForApi(pathname) {
  // READ (viewer)
  const viewerAllowed = [
    "/api/months",
    "/api/dashboard",
    "/api/reports_list",
    "/api/report_get",
    "/api/ping",
    "/api/auth/debug", // если оставлял debug
  ];
  if (viewerAllowed.some((p) => pathname.startsWith(p))) return "viewer";

  // manager can generate reports
  if (pathname.startsWith("/api/report")) return "manager";

  // admin only
  if (pathname.startsWith("/api/import")) return "admin";
  if (pathname.startsWith("/api/sync")) return "admin";

  // default: protect everything else as viewer
  if (pathname.startsWith("/api/")) return "viewer";

  return null;
}

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // allow login routes
  if (pathname === "/login") return NextResponse.next();
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  // public home page
  if (pathname === "/") return NextResponse.next();

  // ✅ Allow Apps Script server-to-server access for import/sync via header token
  // (без куки, но только если правильный токен)
  const envToken = process.env.CRM_SYNC_TOKEN || "";
  const headerToken = req.headers.get("x-crm-sync-token") || "";

  if (envToken && headerToken && headerToken === envToken) {
    if (pathname.startsWith("/api/import") || pathname.startsWith("/api/sync")) {
      return NextResponse.next();
    }
  }

  // check if this route needs auth
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reports");

  const requiredApiRole = requiredRoleForApi(pathname);
  const needsAuth = isProtectedPage || !!requiredApiRole;

  if (!needsAuth) return NextResponse.next();

  // If API request without auth -> return JSON 401 (instead of redirect), to avoid 405 confusion
  const isApi = pathname.startsWith("/api/");

  const token = getCookie(req, "ai_finance_session");
  if (!token) {
    if (isApi) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;
    return NextResponse.redirect(url);
  }

  try {
    const payload = await verify(token);
    const role = String(payload?.role || "viewer");

    if (requiredApiRole) {
      const ok = roleRank(role) >= roleRank(requiredApiRole);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const res = NextResponse.next();
    res.headers.set("x-user-role", role);
    res.headers.set("x-user-login", String(payload?.login || ""));
    return res;
  } catch {
    if (isApi) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
