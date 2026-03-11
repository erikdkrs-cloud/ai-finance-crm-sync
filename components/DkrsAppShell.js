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
var SunIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>; };
var MoonIcon = function () { return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>; };

var DkrsAppShell = function (props) {
  var children = props.children;
  var router = useRouter();
  var auth = useAuth();
  var user = auth ? auth.user : null;

  var _dark = useState(false), dark = _dark[0], setDark = _dark[1];

  useEffect(function () {
    var saved = localStorage.getItem("dkrs-theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

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
    { href: "/import", icon: <ImportIcon />, label: "Импорт", minRole: "manager" },
    { href: "/data-management", icon: <DataIcon />, label: "Данные", minRole: "admin" },
    { href: "/users", icon: <UsersIcon />, label: "Пользователи", minRole: "admin" },
  ];

  function rankOf(role) {
    if (role === "admin") return 3;
    if (role === "manager") return 2;
    return 1;
  }

  var navLinks = allNavLinks.filter(function (link) {
    return rankOf(userRole) >= rankOf(link.minRole);
  });

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
