import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

function roleRank(role) {
  if (role === "admin") return 3;
  if (role === "manager") return 2;
  return 1;
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

  // public page (если хочешь закрыть вообще всё — скажи, я изменю)
  if (pathname === "/") return NextResponse.next();

  // check if this route needs auth
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reports");

  const requiredApiRole = requiredRoleForApi(pathname);
  const needsAuth = isProtectedPage || !!requiredApiRole;

  if (!needsAuth) return NextResponse.next();

  const token = getCookie(req, "ai_finance_session");
  if (!token) {
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

    // optional: прокидываем роль в заголовке (удобно для отладки)
    const res = NextResponse.next();
    res.headers.set("x-user-role", role);
    res.headers.set("x-user-login", String(payload?.login || ""));
    return res;
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
