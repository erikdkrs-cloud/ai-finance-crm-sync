// components/DkrsAppShell.js
import React, { useEffect, useMemo, useState } from "react";

function NavItem({ href, icon, label, active }) {
  return (
    <div
      className={`dkrs-navItem ${active ? "dkrs-navItemActive" : ""}`}
      onClick={() => location.assign(href)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") location.assign(href);
      }}
      title={label}
    >
      <div className="dkrs-navIcon">{icon}</div>
      <div className="dkrs-navLabel">{label}</div>
    </div>
  );
}

export default function DkrsAppShell({ title, subtitle, rightSlot, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pathname = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.pathname || "";
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 920) setDrawerOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const nav = [
    { href: "/dashboard", label: "Дашборд", icon: "✓" },
    { href: "/summary", label: "Сводка", icon: "≡" },
    { href: "/assistant", label: "AI помощник", icon: "◈" },
    { href: "/reports", label: "Отчёты", icon: "▦" },
  ];

  const SidebarPanel = ({ forceOpen }) => (
    <div className="dkrs-sidebarPanel" style={forceOpen ? { width: "100%" } : undefined}>
      <div className="dkrs-brand" onClick={() => location.assign("/dashboard")} role="button" tabIndex={0}>
        <div className="dkrs-brandMark" />
        <div className="dkrs-brandText">DKRS</div>
      </div>

      <div className="dkrs-nav">
        {nav.map((x) => (
          <NavItem
            key={x.href}
            href={x.href}
            icon={x.icon}
            label={x.label}
            active={pathname === x.href || (x.href !== "/dashboard" && pathname.startsWith(x.href))}
          />
        ))}
      </div>

      <div className="dkrs-sidebarFooter">
        <div className="dkrs-footerCard">
          <div className="dkrs-themeToggle">
            <span className="dot" style={{ background: "rgba(251,191,36,0.9)" }} />
            <span className="dkrs-small">Light</span>
          </div>
          <button className="iconBtn" onClick={() => alert("Скоро")} title="Настройки">
            ⚙️
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dkrs-bg">
      <div className="dkrs-app">
        {/* Desktop sidebar */}
        <aside className="dkrs-sidebar">
          <SidebarPanel />
        </aside>

        {/* Main */}
        <main className="dkrs-main">
          <div className="dkrs-topbar">
            <div className="dkrs-topbarInner glass strong">
              <div className="dkrs-topbarLeft">
                <button className="iconBtn" onClick={() => setDrawerOpen(true)} title="Меню" style={{ display: "none" }} />
                <div className="dkrs-topbarTitle">
                  <div className="dkrs-h1">{title}</div>
                  {subtitle ? <div className="dkrs-sub">{subtitle}</div> : null}
                </div>
              </div>

              <div className="dkrs-topbarRight">{rightSlot}</div>
            </div>
          </div>

          <div className="dkrs-container">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? <div className="dkrs-overlay" onClick={() => setDrawerOpen(false)} /> : null}
      {drawerOpen ? (
        <div className="dkrs-drawer">
          <SidebarPanel forceOpen />
        </div>
      ) : null}

      {/* show burger only on mobile */}
      <style jsx>{`
        @media (max-width: 920px) {
          .dkrs-topbarLeft :global(.iconBtn) {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}
