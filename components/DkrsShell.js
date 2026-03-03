// components/DkrsShell.js
import Link from "next/link";

export default function DkrsShell({ title, subtitle, right, children }) {
  return (
    <div className="dkrs-bg">
      <div className="dkrs-topbar">
        <div className="dkrs-topbar-inner">
          <div className="dkrs-brand">
            <div className="dkrs-logo">DKRS</div>
            <nav className="dkrs-nav">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/reports">Reports</Link>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ opacity: 0.75 }}>
                Security
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ opacity: 0.75 }}>
                Pricing
              </a>
            </nav>
          </div>

          <div className="dkrs-topbar-right">
            {right}
          </div>
        </div>
      </div>

      <div className="dkrs-container">
        {(title || subtitle) && (
          <div className="dkrs-hero">
            {title ? <div className="dkrs-h1">{title}</div> : null}
            {subtitle ? <div className="dkrs-sub">{subtitle}</div> : null}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
