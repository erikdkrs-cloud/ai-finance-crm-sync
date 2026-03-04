// components/DkrsAppShell.js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

function NavItem({ href, label, icon, isActive, onClick }) {
  return (
    <Link href={href} legacyBehavior>
      <a
        className={`dkrs-sb-item ${isActive ? "active" : ""}`}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
      >
        <span className="dkrs-sb-ic">{icon}</span>
        <span className="dkrs-sb-label">{label}</span>
      </a>
    </Link>
  );
}

export default function DkrsAppShell({ title, subtitle, right, children }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // close drawer on route change (mobile)
  useEffect(() => {
    const handle = () => setOpen(false);
    router.events.on("routeChangeStart", handle);
    return () => router.events.off("routeChangeStart", handle);
  }, [router.events]);

  const path = router.pathname;

  const items = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: "📊", key: "/dashboard" },
      { href: "/insights", label: "Insights", icon: "✨", key: "/insights" },
      { href: "/assistant", label: "AI Assistant", icon: "🎧", key: "/assistant" },
      { href: "/reports", label: "Reports", icon: "🧾", key: "/reports" },
    ],
    []
  );

  return (
    <div className="dkrs-app">
      {/* sidebar */}
      <aside className={`dkrs-sb ${open ? "open" : ""}`}>
        <div className="dkrs-sb-top">
          <div className="dkrs-sb-brand">
            <div className="dkrs-logo">DKRS</div>
            <div className="dkrs-sb-brand-sub">AI Finance CRM</div>
          </div>

          <button className="dkrs-sb-close" onClick={() => setOpen(false)} aria-label="Close menu">
            ✕
          </button>
        </div>

        <nav className="dkrs-sb-nav">
          {items.map((it) => (
            <NavItem
              key={it.href}
              href={it.href}
              label={it.label}
              icon={it.icon}
              isActive={path === it.key}
              onClick={() => setOpen(false)}
            />
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

      {/* overlay (mobile) */}
      <div className={`dkrs-sb-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />

      {/* main */}
      <main className="dkrs-main">
        {/* topbar */}
        <div className="dkrs-topbar dkrs-topbar-app">
          <div className="dkrs-topbar-inner">
            <div className="dkrs-app-left">
              <button className="dkrs-sb-burger" onClick={() => setOpen(true)} aria-label="Open menu">
                ☰
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
