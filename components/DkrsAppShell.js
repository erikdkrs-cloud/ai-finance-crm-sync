// components/DkrsAppShell.js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

function NavIcon({ name }) {
  // simple inline “icons” without libs
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
  const stroke = "currentColor";

  if (name === "dashboard") {
    return (
      <svg {...common}>
        <path d="M4 13h7V4H4v9zM13 20h7V11h-7v9zM13 4v5h7V4h-7zM4 20h7v-5H4v5z" stroke={stroke} strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === "insights") {
    return (
      <svg {...common}>
        <path d="M4 19h16" stroke={stroke} strokeWidth="1.8" />
        <path d="M7 16V8" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 16V5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17 16v-6" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "assistant") {
    return (
      <svg {...common}>
        <path d="M12 3a4 4 0 0 1 4 4v3a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z" stroke={stroke} strokeWidth="1.8" />
        <path d="M6 10a6 6 0 0 0 12 0" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 16v5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "reports") {
    return (
      <svg {...common}>
        <path d="M7 3h8l2 2v16H7V3z" stroke={stroke} strokeWidth="1.8" />
        <path d="M9 9h6M9 13h6M9 17h5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "menu") {
    return (
      <svg {...common}>
        <path d="M5 7h14M5 12h14M5 17h14" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "close") {
    return (
      <svg {...common}>
        <path d="M6 6l12 12M18 6L6 18" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return null;
}

export default function DkrsAppShell({ title, subtitle, right, children }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = useMemo(
    () => [
      { href: "/dashboard", label: "Дашборд", icon: "dashboard" },
      { href: "/insights", label: "Сводка", icon: "insights" },
      { href: "/assistant", label: "AI помощник", icon: "assistant" },
      { href: "/reports", label: "Отчёты", icon: "reports" },
    ],
    []
  );

  function isActive(href) {
    if (!router?.pathname) return false;
    if (href === "/dashboard") return router.pathname === "/dashboard" || router.pathname === "/";
    return router.pathname === href || router.pathname.startsWith(href + "/");
  }

  // close drawer on route change
  useEffect(() => {
    const handle = () => setDrawerOpen(false);
    router?.events?.on("routeChangeStart", handle);
    return () => router?.events?.off("routeChangeStart", handle);
  }, [router]);

  return (
    <div className="dkrs-bg">
      {/* Mini icon sidebar (desktop/tablet) */}
      <aside className="dkrs-mini" aria-label="Навигация">
        <div className="dkrs-mini-top">
          <Link href="/dashboard">
            <a className="dkrs-mini-brand" aria-label="DKRS">
              DKRS
            </a>
          </Link>
        </div>

        <nav className="dkrs-mini-nav">
          {items.map((it) => (
            <Link key={it.href} href={it.href}>
              <a className={`dkrs-mini-item ${isActive(it.href) ? "active" : ""}`}>
                <span className="dkrs-mini-ico">
                  <NavIcon name={it.icon} />
                </span>
                <span className="dkrs-mini-text">{it.label}</span>
              </a>
            </Link>
          ))}
        </nav>

        <div className="dkrs-mini-bottom">
          <button
            className="dkrs-mini-logout"
            onClick={async () => {
              await fetch("/api/auth/logout");
              window.location.href = "/login";
            }}
            title="Выйти"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="dkrs-main">
        <header className="dkrs-topbar dkrs-topbar-app">
          <div className="dkrs-topbar-inner">
            <div className="dkrs-app-left">
              <div className="dkrs-hero" style={{ padding: 0 }}>
                <div className="dkrs-h1 dkrs-h1-sm">{title || "Дашборд"}</div>
                {subtitle ? <div className="dkrs-sub">{subtitle}</div> : null}
              </div>
            </div>

            <div className="dkrs-topbar-right">
              {right ? <div className="dkrs-right-slot">{right}</div> : null}

              {/* Mobile menu button */}
              <button
                className="dkrs-mobile-menu"
                onClick={() => setDrawerOpen(true)}
                aria-label="Открыть меню"
                title="Меню"
              >
                <NavIcon name="menu" />
              </button>
            </div>
          </div>
        </header>

        <div className="dkrs-container dkrs-container-app">{children}</div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="dkrs-drawer-overlay" role="dialog" aria-modal="true">
          <div className="dkrs-drawer">
            <div className="dkrs-drawer-head">
              <div className="dkrs-drawer-brand">DKRS</div>
              <button className="dkrs-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Закрыть меню">
                <NavIcon name="close" />
              </button>
            </div>

            <div className="dkrs-drawer-section">Навигация</div>

            <div className="dkrs-drawer-nav">
              {items.map((it) => (
                <Link key={it.href} href={it.href}>
                  <a className={`dkrs-drawer-item ${isActive(it.href) ? "active" : ""}`}>
                    <span className="dkrs-mini-ico">
                      <NavIcon name={it.icon} />
                    </span>
                    <span style={{ fontWeight: 900 }}>{it.label}</span>
                  </a>
                </Link>
              ))}
            </div>

            <button
              className="dkrs-drawer-logout"
              onClick={async () => {
                await fetch("/api/auth/logout");
                window.location.href = "/login";
              }}
            >
              Выйти
            </button>
          </div>

          {/* click outside */}
          <button className="dkrs-drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label="Закрыть" />
        </div>
      ) : null}
    </div>
  );
}
