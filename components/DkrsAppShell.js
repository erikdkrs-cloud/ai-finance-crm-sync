import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>;
const SummaryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>;
const AssistantIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H5C3.9 2 3 2.9 3 4v13.09c0 .98.63 1.81 1.5 2.18C4.86 19.45 5.25 19.5 5.62 19.5c.38 0 .75-.08 1.1-.25l4.28-2.04L15.3 19.25c.35.17.72.25 1.1.25.37 0 .74-.05 1.1-.16.88-.37 1.5-1.2 1.5-2.18V4c0-1.1-.9-2-2-2zm-5.12 10.88L12 12.1l-1.88.78L12 10.25l1.88-2.63L12 6.9l-1.88-.78L12 3.5l1.88 2.62L12 8.75l1.88 1.5-1.88.63z"/></svg>;
const ReportsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>;

const DkrsAppShell = ({ children }) => {
  const router = useRouter();
  const navLinks = [
    { href: '/dashboard', icon: <DashboardIcon />, label: 'Дашборд' },
    { href: '/summary', icon: <SummaryIcon />, label: 'Сводка' },
    { href: '/assistant', icon: <AssistantIcon />, label: 'AI помощник' },
    { href: '/reports', icon: <ReportsIcon />, label: 'Отчёты' },
  ];
  const fallbackAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a0aec0'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

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
            {navLinks.map((link) => (
              <li key={link.href} className={router.pathname === link.href ? 'active' : ''}>
                <Link href={link.href}>
                  <span className="nav-icon">{link.icon}</span>
                  <span className="nav-text">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-right">
            <div className="user-profile">
              <img src="/user-avatar.png" alt="User" onError={(e) => { e.target.onerror = null; e.target.src=fallbackAvatar; }} />
            </div>
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
