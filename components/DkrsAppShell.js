import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "./AuthProvider";

function DashboardIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M4 13h6a1 1 0 001-1V4a1 1 0 00-1-1H4a1 1 0 00-1 1v8a1 1 0 001 1zm0 8h6a1 1 0 001-1v-4a1 1 0 00-1-1H4a1 1 0 00-1 1v4a1 1 0 001 1zm10 0h6a1 1 0 001-1v-8a1 1 0 00-1-1h-6a1 1 0 00-1 1v8a1 1 0 001 1zm0-18v4a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1h-6a1 1 0 00-1 1z"/></svg>; }
function SummaryIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm3-4H7v-2h8v2zm0-4H7V7h8v2z"/></svg>; }
function AssistantIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>; }
function ReportsIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2 2H5V5h14v14zM19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>; }
function AnalyticsIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/></svg>; }
function VacancyIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>; }
function ImportIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>; }
function DataIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>; }
function UsersIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>; }
function PortalIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>; }
function ProfileIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>; }
function BirthdayIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9h-5V7h-2v2H6c-1.66 0-3 1.34-3 3v1.54c0 1.08.88 1.96 1.96 1.96.52 0 1.02-.2 1.38-.57l2.14-2.13 2.13 2.13c.74.74 2.03.74 2.77 0l2.14-2.13 2.13 2.13c.37.37.86.57 1.38.57 1.08 0 1.96-.88 1.96-1.96V12c.01-1.66-1.33-3-2.99-3z"/></svg>; }
function OrgIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z"/></svg>; }
function SunIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>; }
function MoonIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }
function AdminIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>; }
function ChevronIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>; }
function LogoutIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>; }

var DkrsAppShell = function (props) {
  var children = props.children;
  var router = useRouter();
  var auth = useAuth();
  var user = auth ? auth.user : null;

  var _dark = useState(false), dark = _dark[0], setDark = _dark[1];
  var _portalOpen = useState(true), portalOpen = _portalOpen[0], setPortalOpen = _portalOpen[1];

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
    { href: "/dashboard", icon: React.createElement(DashboardIcon), label: "Дашборд", minRole: "viewer" },
    { href: "/summary", icon: React.createElement(SummaryIcon), label: "Сводка", minRole: "viewer" },
    { href: "/assistant", icon: React.createElement(AssistantIcon), label: "AI помощник", minRole: "viewer" },
    { href: "/reports", icon: React.createElement(ReportsIcon), label: "Отчёты", minRole: "viewer" },
    { href: "/analytics", icon: React.createElement(AnalyticsIcon), label: "Аналитика", minRole: "viewer" },
    { href: "/vacancies", icon: React.createElement(VacancyIcon), label: "Вакансии", minRole: "manager" },
    { href: "/import", icon: React.createElement(ImportIcon), label: "Импорт", minRole: "director" },
    { href: "/data-management", icon: React.createElement(DataIcon), label: "Данные", minRole: "admin" },
    { href: "/users", icon: React.createElement(UsersIcon), label: "Пользователи", minRole: "admin" },
  ];

  var portalLinks = [
    { href: "/portal", icon: React.createElement(BirthdayIcon), label: "Главная" },
    { href: "/portal/profile", icon: React.createElement(ProfileIcon), label: "Мой профиль" },
    { href: "/portal/org", icon: React.createElement(OrgIcon), label: "Структура" },
    { href: "/portal/team", icon: React.createElement(UsersIcon), label: "Команда" },
  ];

  if (userRole === "admin") {
    portalLinks.push({ href: "/portal/admin", icon: React.createElement(AdminIcon), label: "Управление" });
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
    return React.createElement("div", { className: "app-shell" },

    /* === PREMIUM SIDEBAR === */
    React.createElement("aside", { className: "sidebar" },

      /* Logo */
      React.createElement("div", { className: "sidebar-logo" },
        React.createElement("div", { className: "sidebar-logo-icon" }, "D"),
        React.createElement("span", { className: "sidebar-logo-text" }, "DKRS")
      ),

      /* Navigation */
      React.createElement("nav", { className: "sidebar-nav" },

        /* Section: Main */
        React.createElement("div", { className: "sidebar-section-title" }, "Основное"),

        /* Main nav links */
        navLinks.map(function (link) {
          var isActive = router.pathname === link.href;
          return React.createElement(Link, { key: link.href, href: link.href, legacyBehavior: true },
            React.createElement("a", { className: "sidebar-item" + (isActive ? " active" : "") },
              React.createElement("span", { className: "sidebar-item-icon" }, link.icon),
              React.createElement("span", { className: "sidebar-item-text" }, link.label)
            )
          );
        }),

        /* Section: Portal */
        React.createElement("div", { className: "sidebar-section-title" }, "Портал"),

        /* Portal toggle */
        React.createElement("button", {
          className: "sidebar-item" + (router.pathname.startsWith("/portal") ? " active" : ""),
          onClick: function () { setPortalOpen(!portalOpen); },
          style: { cursor: "pointer" }
        },
          React.createElement("span", { className: "sidebar-item-icon" }, React.createElement(PortalIcon)),
          React.createElement("span", { className: "sidebar-item-text" }, "Портал"),
          React.createElement("span", {
            style: {
              marginLeft: "auto",
              transform: portalOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
              display: "flex"
            }
          }, React.createElement(ChevronIcon))
        ),

        /* Portal submenu */
        portalOpen && React.createElement("div", { className: "sidebar-submenu" },
          portalLinks.map(function (link) {
            var isActive = router.pathname === link.href;
            return React.createElement(Link, { key: link.href, href: link.href, legacyBehavior: true },
              React.createElement("a", { className: "sidebar-item" + (isActive ? " active" : "") },
                React.createElement("span", { className: "sidebar-item-icon" }, link.icon),
                React.createElement("span", { className: "sidebar-item-text" }, link.label)
              )
            );
          })
        )
      ),

      /* Sidebar Footer */
      React.createElement("div", { className: "sidebar-footer" },

        /* Theme toggle */
        React.createElement("button", {
          className: "sidebar-item",
          onClick: toggleTheme,
          title: dark ? "Светлая тема" : "Тёмная тема"
        },
          React.createElement("span", { className: "sidebar-item-icon" },
            dark ? React.createElement(SunIcon) : React.createElement(MoonIcon)
          ),
          React.createElement("span", { className: "sidebar-item-text" },
            dark ? "Светлая тема" : "Тёмная тема"
          )
        ),

        /* User info */
        React.createElement("div", {
          className: "sidebar-item",
          style: { cursor: "default", marginTop: "4px" }
        },
          React.createElement("div", {
            className: "sidebar-item-icon",
            style: {
              width: "32px", height: "32px",
              borderRadius: "10px",
              background: "var(--dkrs-gradient-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: "700", fontSize: "12px",
              flexShrink: 0
            }
          }, initials),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", overflow: "hidden" } },
            React.createElement("span", {
              className: "sidebar-item-text",
              style: { fontSize: "13px", fontWeight: "600", color: "#fff" }
            }, userName),
            React.createElement("span", {
              className: "sidebar-item-text",
              style: { fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: "500" }
            }, userRole)
          )
        ),

        /* Logout */
        auth && React.createElement("button", {
          className: "sidebar-item",
          onClick: auth.logout,
          title: "Выйти",
          style: { marginTop: "4px" }
        },
          React.createElement("span", { className: "sidebar-item-icon" }, React.createElement(LogoutIcon)),
          React.createElement("span", { className: "sidebar-item-text" }, "Выйти")
        )
      )
    ),

    /* === MAIN CONTENT === */
    React.createElement("main", { className: "main-content" }, children)
  );
};

export default DkrsAppShell;
