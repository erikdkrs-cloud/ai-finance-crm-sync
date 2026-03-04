// components/DkrsAppShell.js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

function Icon({ name }) {
  // Minimal inline icons (no dependency)
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}><path d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-11h7V4h-7v5Z" fill="currentColor"/></svg>
      );
    case "summary":
      return (
        <svg {...common}><path d="M5 4h14v4H5V4Zm0 6h14v4H5v-4Zm0 6h10v4H5v-4Z" fill="currentColor"/></svg>
      );
    case "assistant":
      return (
        <svg {...common}><path d="M12 2a7 7 0 0 0-7 7v3a3 3 0 0 0 3 3h1v2a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-2h1a3 3 0 0 0 3-3V9a7 7 0 0 0-7-7Zm-5 10V9a5 5 0 1 1 10 0v3a1 1 0 0 1-1 1h-2v4a1 1 0 0 1-1 1H11a1 1 0 0 1-1-1v-4H8a1 1 0 0 1-1-1Z" fill="currentColor"/></svg>
      );
    case "reports":
      return (
        <svg {...common}><path d="M7 3h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Zm2 6h6v2H9V9Zm0 4h6v2H9v-2Z" fill="currentColor"/></svg>
      );
    case "menu":
      return (
        <svg {...common}><path d="M4 7h16v2H4V7Zm0 8h16v2H4v-2Zm0-4h16v2H4v-2Z" fill="currentColor"/></svg>
      );
    default:
      return null;
  }
}

const NAV = [
  { href: "/dashboard", label: "Дашборд", icon: "dashboard" },
  { href: "/summary", label: "Сводка", icon: "summary" },      // если страницы нет — потом добавим
  { href: "/assistant", label: "AI помощник", icon: "assistant" },
  { href: "/reports", label: "Отчёты", icon: "reports" },
];

function isActive(pathname, href) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function Sidebar({ pathname, onNavigate }) {
  return (
    <aside className="dkrs-sidebar">
      <div className="dkrs-sidebarPanel">
        <Link href="/dashboard" className="dkrs-brand" onClick={onNavigate}>
          <div className="dkrs-brandMark" />
          <div className="dkrs-brandText">DKRS</div>
        </Link>

        <nav className="dkrs-nav">
          {NAV.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNavigate}
              className={[
                "dkrs-navItem",
                isActive(pathname, it.href) ? "dkrs-navItemActive" : "",
              ].join(" ")}
            >
              <span className="dkrs-navIcon" aria-hidden>
                <Icon name={it.icon} />
              </span>
              <span className="dkrs-navLabel">{it.label}</span>
            </Link>
          ))}
        </nav>

        <div className="dkrs-sidebarFooter">
          <div className="dkrs-footerCard">
            <div className="dkrs-themeToggle">
              <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
              <span className="dkrs-small">Light • Glass</span>
            </div>
            <span className="dot" style={{ background: "rgba(20,184,166,0.9)" }} />
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function DkrsAppShell({
  title,
  subtitle,
  rightSlot,
  children,
}) {
  const router = useRouter();
  const pathname = router?.pathname;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 920px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    // close drawer on route change
    const onRoute = () => setDrawerOpen(false);
    router.events?.on("routeChangeComplete", onRoute);
    return () => router.events?.off("routeChangeComplete", onRoute);
  }, [router.events]);

  const topbar = (
    <div className="dkrs-topbar glass strong">
      <div className="dkrs-topbarInner">
        <div className="dkrs-topbarLeft">
          {isMobile && (
            <button className="iconBtn" onClick={() => setDrawerOpen(true)} aria-label="Открыть меню">
              <Icon name="menu" />
            </button>
          )}

          <div className="dkrs-topbarTitle">
            <h1 className="dkrs-h1">{title || "DKRS"}</h1>
            {subtitle ? <div className="dkrs-sub">{subtitle}</div> : null}
          </div>
        </div>

        <div className="dkrs-topbarRight">
          {rightSlot || null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="dkrs-bg">
      <div className="dkrs-app">
        {/* Desktop sidebar */}
        <Sidebar pathname={pathname} />

        {/* Mobile drawer */}
        {isMobile && drawerOpen ? (
          <>
            <div className="dkrs-overlay" onClick={() => setDrawerOpen(false)} />
            <div className="dkrs-drawer">
              <Sidebar pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </>
        ) : null}

        <main className="dkrs-main">
          {topbar}
          <div className="dkrs-container">{children}</div>
        </main>
      </div>
    </div>
  );
}
