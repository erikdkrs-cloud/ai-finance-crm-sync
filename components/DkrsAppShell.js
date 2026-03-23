import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "./AuthProvider";

var DashboardIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>; };
var SummaryIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>; };
var AssistantIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>; };
var ReportsIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>; };
var ImportIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>; };
var DataIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h12v2H3v-2zm16-4l4 4h-3v4h-2v-4h-3l4-4z"/></svg>; };
var AnalyticsIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/></svg>; };
var VacancyIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>; };
var UsersIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>; };
var PortalIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>; };
var ProfileIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>; };
var BirthdayIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9h-5V7h-2v2H6c-1.66 0-3 1.34-3 3v1.54c0 1.08.88 1.96 1.96 1.96.52 0 1.02-.2 1.38-.57l2.14-2.13 2.13 2.13c.74.74 2.03.74 2.77 0l2.14-2.13 2.13 2.13c.37.37.86.57 1.38.57 1.08 0 1.96-.88 1.96-1.96V12c.01-1.66-1.33-3-2.99-3z"/></svg>; };
var OrgIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z"/></svg>; };
var SunIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>; };
var MoonIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>; };

var DkrsAppShell = function (props) {
  var children = props.children;
  var router = useRouter();
  var auth = useAuth();
  var user = auth ? auth.user : null;

  var _dark = useState(false), dark = _dark[0], setDark = _dark[1];
  var _portalOpen = useState(false), portalOpen = _portalOpen[0], setPortalOpen = _portalOpen[1];

  useEffect(function () {
    var saved = localStorage.getItem("dkrs-theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  useEffect(function () {
    if (router.pathname.startsWith("/portal")) setPortalOpen(true);
  }, [router.pathname]);

  var toggleTheme = function () {
    var next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("dkrs-theme", next ? "dark" : "light");
  };

  var initials = user ? user.name.split(" ").map(function (w) { return w[0]; }).join("").toUpperCase().slice(0, 2) : "DK";
  var userName = user ? user.name : "User";
  var userRole = user ? user.role : "";

  var allNavLinks = [
    { href: "/dashboard", icon: <DashboardIcon />, label: "Дашборд", minRole: "viewer" },
    { href: "/summary", icon: <SummaryIcon />, label: "Сводка", minRole: "viewer" },
    { href: "/assistant", icon: <AssistantIcon />, label: "AI помощник", minRole: "viewer" },
    { href: "/reports", icon: <ReportsIcon />, label: "Отчёты", minRole: "viewer" },
    { href: "/analytics", icon: <AnalyticsIcon />, label: "Аналитика", minRole: "viewer" },
    { href: "/vacancies", icon: <VacancyIcon />, label: "Вакансии", minRole: "manager" },
    { href: "/import", icon: <ImportIcon />, label: "Импорт", minRole: "director" },
    { href: "/data-management", icon: <DataIcon />, label: "Данные", minRole: "admin" },
    { href: "/users", icon: <UsersIcon />, label: "Пользователи", minRole: "admin" },
  ];

  var portalLinks = [
    { href: "/portal", icon: <BirthdayIcon />, label: "Главная" },
    { href: "/portal/profile", icon: <ProfileIcon />, label: "Мой профиль" },
    { href: "/portal/org", icon: <OrgIcon />, label: "Структура" },
    { href: "/portal/team", icon: <UsersIcon />, label: "Команда" },
  ];

  if (userRole === "admin") {
    portalLinks.push({ href: "/portal/admin", icon: <DataIcon />, label: "Управление" });
  }

  function rankOf(role) {
    if (role === "admin") return 4;
    if (role === "director") return 3;
    if (role === "manager") return 2;
    return 1;
  }

  var navLinks;
  if (userRole === "manager") {
    navLinks = allNavLinks.filter(function (link) {
      return link.href === "/vacancies";
    });
  } else {
    navLinks = allNavLinks.filter(function (link) {
      return rankOf(userRole) >= rankOf(link.minRole);
    });
  }

  return (
    <div className="dkrs-app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Link href="/dashboard">
            <span className="logo-icon">D</span>
            <span className="logo-text">DKRS</span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          <ul>
            {navLinks.map(function (link) {
              return (
                <li key={link.href} className={router.pathname === link.href ? "active" : ""}>
                  <Link href={link.href}>
                    <span className="nav-icon">{link.icon}</span>
                    <span className="nav-text">{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div style={{
            height: 1,
            background: "var(--sidebar-border, rgba(255,255,255,0.1))",
            margin: "12px 16px"
          }}></div>

          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li>
              <button onClick={function () { setPortalOpen(!portalOpen); }} style={{
                width: "calc(100% - 24px)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                margin: "0 12px",
                background: portalOpen ? "var(--sidebar-active-bg, rgba(59,130,246,0.15))" : "transparent",
                border: "none",
                borderRadius: 8,
                color: portalOpen ? "var(--sidebar-active-color, #60a5fa)" : "var(--sidebar-color, rgba(255,255,255,0.7))",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "left"
              }}>
                <span className="nav-icon"><PortalIcon /></span>
                <span className="nav-text">Портал</span>
                <span style={{
                  marginLeft: "auto",
                  transform: portalOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                  fontSize: 10
                }}>▼</span>
              </button>
            </li>
            {portalOpen && portalLinks.map(function (link) {
              var isActive = router.pathname === link.href;
              return (
                <li key={link.href} className={isActive ? "active" : ""} style={{ paddingLeft: 12 }}>
                  <Link href={link.href}>
                    <span className="nav-icon">{link.icon}</span>
                    <span className="nav-text">{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-right">
            <button className="theme-toggle" onClick={toggleTheme} title={dark ? "Светлая тема" : "Тёмная тема"}>
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="user-avatar-wrapper">
              <div className="user-avatar-circle">
                <span>{initials}</span>
              </div>
              <div className="user-info">
                <span className="user-avatar-name">{userName}</span>
                <span className="user-role-badge">{userRole}</span>
              </div>
            </div>
            {auth && (
              <button className="logout-btn" onClick={auth.logout} title="Выйти">
                🚪
              </button>
            )}
          </div>
        </header>
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DkrsAppShell;
