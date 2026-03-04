// components/DkrsAppShell.js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const Icons = {
  dashboard: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 13.2c0-.7.5-1.2 1.2-1.2h4.6c.7 0 1.2.5 1.2 1.2v5.6c0 .7-.5 1.2-1.2 1.2H5.2c-.7 0-1.2-.5-1.2-1.2v-5.6Z"
        stroke={active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.72)"}
        strokeWidth="1.6"
      />
      <path
        d="M13 5.2c0-.7.5-1.2 1.2-1.2h4.6c.7 0 1.2.5 1.2 1.2v13.6c0 .7-.5 1.2-1.2 1.2h-4.6c-.7 0-1.2-.5-1.2-1.2V5.2Z"
        stroke={active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.72)"}
        strokeWidth="1.6"
      />
      <path
        d="M4 5.2C4 4.5 4.5 4 5.2 4h4.6c.7 0 1.2.5 1.2 1.2v3.6c0 .7-.5 1.2-1.2 1.2H5.2C4.5 10 4 9.5 4 8.8V5.2Z"
        stroke={active ? "rgba(185,255,46,0.95)" : "rgba(185,255,46,0.65)"}
        strokeWidth="1.6"
      />
    </svg>
  ),
  insights: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 17.2c3.2-8 6.6-10.8 10.2-8.4 2.4 1.6 3.8 1 5.8-1.8"
        stroke={active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.72)"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 19h10"
        stroke={active ? "rgba(185,255,46,0.95)" : "rgba(185,255,46,0.65)"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6.2 13.2l2.1 2.1 3.8-5.2 3 2.5 4-5"
        stroke={active ? "rgba(124,58,237,0.95)" : "rgba(124,58,237,0.70)"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  assistant: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3a6 6 0 0 0-6 6v3.4a3.6 3.6 0 0 0 3.6 3.6H12a3.6 3.6 0 0 0 3.6-3.6V9a6 6 0 0 0-6-6Z"
        stroke={active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.72)"}
        strokeWidth="1.6"
      />
      <path
        d="M5.5 11.2v1.2A6.5 6.5 0 0 0 12 19a6.5 6.5 0 0 0 6.5-6.6v-1.2"
        stroke={active ? "rgba(185,255,46,0.95)" : "rgba(185,255,46,0.65)"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 19v2"
        stroke={active ? "rgba(124,58,237,0.95)" : "rgba(124,58,237,0.70)"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  reports: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3.8h7.2L18 7.6V20a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 20V5.6A1.8 1.8 0 0 1 7 3.8Z"
        stroke={active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.72)"}
        strokeWidth="1.6"
      />
      <path
        d="M14.2 3.8V7a.9.9 0 0 0 .9.9H18"
        stroke={active ? "rgba(185,255,46,0.95)" : "rgba(185,255,46,0.65)"}
        strokeWidth="1.6"
      />
      <path
        d="M8 11h8M8 14.5h8M8 18h5"
        stroke={active ? "rgba(124,58,237,0.95)" : "rgba(124,58,237,0.70)"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
};

function NavItem({ href, label, icon, isActive, onClick }) {
  return (
    <Link href={href} legacyBehavior>
      <a className={`dkrs-sb-item ${isActive ? "active" : ""}`} onClick={onClick} aria-current={isActive ? "page" : undefined}>
        <span className="dkrs-sb-ic">{icon}</span>
        <span className="dkrs-sb-label">{label}</span>
      </a>
    </Link>
  );
}

export default function DkrsAppShell({ title, subtitle, right, children }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handle = () => setOpen(false);
    router.events.on("routeChangeStart", handle);
    return () => router.events.off("routeChangeStart", handle);
  }, [router.events]);

  const path = router.pathname;

  const items = useMemo(
    () => [
      {
        href: "/dashboard",
        label: "Дашборд",
        key: "/dashboard",
        icon: <Icons.dashboard active={path === "/dashboard"} />,
      },
      {
        href: "/insights",
        label: "Сводка",
        key: "/insights",
        icon: <Icons.insights active={path === "/insights"} />,
      },
      {
        href: "/assistant",
        label: "AI помощник",
        key: "/assistant",
        icon: <Icons.assistant active={path === "/assistant"} />,
      },
      {
        href: "/reports",
        label: "Отчёты",
        key: "/reports",
        icon: <Icons.reports active={path === "/reports"} />,
      },
    ],
    [path]
  );

  return (
    <div className="dkrs-app drawer-only">
      {/* sidebar (drawer) */}
      <aside className={`dkrs-sb ${open ? "open" : ""}`}>
        <div className="dkrs-sb-top">
          <div className="dkrs-sb-brand">
            <div className="dkrs-logo">DKRS</div>
            <div className="dkrs-sb-brand-sub">AI Finance CRM</div>
          </div>

          <button className="dkrs-sb-close" onClick={() => setOpen(false)} aria-label="Закрыть меню">
            ✕
          </button>
        </div>

        <div className="dkrs-sb-section">
          <div className="dkrs-sb-section-title">Навигация</div>
        </div>

        <nav className="dkrs-sb-nav">
          {items.map((it) => (
            <NavItem key={it.href} href={it.href} label={it.label} icon={it.icon} isActive={path === it.key} onClick={() => setOpen(false)} />
          ))}
        </nav>

        <div className="dkrs-sb-bottom">
          <button
            className="dkrs-btn dkrs-btn-ghost"
            onClick={async () => {
              await fetch("/api/auth/logout");
              window.location.href = "/login";
            }}
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* overlay */}
      <div className={`dkrs-sb-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />

      {/* main */}
      <main className="dkrs-main">
        <div className="dkrs-topbar dkrs-topbar-app">
          <div className="dkrs-topbar-inner">
            <div className="dkrs-app-left">
              <button className="dkrs-sb-burger" onClick={() => setOpen(true)} aria-label="Открыть меню">
                <span className="dkrs-burger-ic">☰</span>
              </button>

              <div className="dkrs-hero" style={{ padding: 0 }}>
                {title ? <div className="dkrs-h1 dkrs-h1-sm">{title}</div> : null}
                {subtitle ? <div className="dkrs-sub">{subtitle}</div> : null}
              </div>
            </div>

            <div className="dkrs-topbar-right">{right}</div>
          </div>
        </div>

        <div className="dkrs-container dkrs-container-app">{children}</div>
      </main>
    </div>
  );
}
