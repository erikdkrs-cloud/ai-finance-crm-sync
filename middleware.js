import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

function roleRank(role) {
  if (role === "admin") return 3;
  if (role === "manager") return 2;
  return 1;
}

async function verify(token) {
  var secret = process.env.AUTH_SECRET || "";
  if (!secret) throw new Error("AUTH_SECRET is not set");
  var key = new TextEncoder().encode(secret);
  var result = await jwtVerify(token, key);
  return result.payload;
}

function getCookie(req, name) {
  var cookie = req.headers.get("cookie") || "";
  var parts = cookie.split(";").map(function (x) { return x.trim(); });
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(name + "=")) return decodeURIComponent(parts[i].slice(name.length + 1));
  }
  return "";
}

function requiredRoleForApi(pathname) {
  // Auth endpoints — always open
  if (pathname.startsWith("/api/auth/")) return null;

  // Viewer level
  var viewerPaths = [
    "/api/months", "/api/dashboard", "/api/reports_list",
    "/api/report_get", "/api/ping", "/api/summary",
    "/api/analytics", "/api/budget", "/api/data-management",
  ];
  for (var i = 0; i < viewerPaths.length; i++) {
    if (pathname.startsWith(viewerPaths[i])) return "viewer";
  }

  // Manager level
  if (pathname.startsWith("/api/report")) return "manager";
  if (pathname.startsWith("/api/ai")) return "manager";

  // Admin only
  if (pathname.startsWith("/api/import")) return "admin";
  if (pathname.startsWith("/api/sync")) return "admin";
  if (pathname.startsWith("/api/users")) return "admin";

  // Default
  if (pathname.startsWith("/api/")) return "viewer";

  return null;
}

export async function middleware(req) {
  var pathname = req.nextUrl.pathname;
  var search = req.nextUrl.search || "";

  // Public pages
  if (pathname === "/") return NextResponse.next();
  if (pathname === "/login") return NextResponse.next();
  if (pathname === "/register") return NextResponse.next();

  // Auth API — always open
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  // CRM sync token
  var envToken = process.env.CRM_SYNC_TOKEN || "";
  var headerToken = req.headers.get("x-crm-sync-token") || "";
  if (envToken && headerToken && headerToken === envToken) {
    if (pathname.startsWith("/api/import") || pathname.startsWith("/api/sync")) {
      return NextResponse.next();
    }
  }

  // Protected pages
  var isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/summary") ||
    pathname.startsWith("/assistant") ||
    pathname.startsWith("/import") ||
    pathname.startsWith("/data-management") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/budget") ||
    pathname.startsWith("/users");

  var requiredApiRole = requiredRoleForApi(pathname);
  var needsAuth = isProtectedPage || !!requiredApiRole;

  if (!needsAuth) return NextResponse.next();

  var isApi = pathname.startsWith("/api/");
  var token = getCookie(req, "ai_finance_session");

  if (!token) {
    if (isApi) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    var url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?next=" + encodeURIComponent(pathname + search);
    return NextResponse.redirect(url);
  }

  try {
    var payload = await verify(token);
    var role = String(payload.role || "viewer");

    // Check page-level role restrictions
    if (pathname.startsWith("/users") && role !== "admin") {
      var url403 = req.nextUrl.clone();
      url403.pathname = "/dashboard";
      return NextResponse.redirect(url403);
    }

    if (pathname.startsWith("/import") && role !== "admin") {
      var urlImport = req.nextUrl.clone();
      urlImport.pathname = "/dashboard";
      return NextResponse.redirect(urlImport);
    }

    if (requiredApiRole) {
      var ok = roleRank(role) >= roleRank(requiredApiRole);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    var response = NextResponse.next();
    response.headers.set("x-user-role", role);
    response.headers.set("x-user-login", String(payload.login || ""));
    if (payload.userId) response.headers.set("x-user-id", String(payload.userId));
    if (payload.name) response.headers.set("x-user-name", String(payload.name));
    return response;
  } catch (e) {
    if (isApi) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    var urlLogin = req.nextUrl.clone();
    urlLogin.pathname = "/login";
    urlLogin.search = "?next=" + encodeURIComponent(pathname + search);
    return NextResponse.redirect(urlLogin);
  }
}

export var config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
