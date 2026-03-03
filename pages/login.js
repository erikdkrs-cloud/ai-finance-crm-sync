// pages/login.js
import React, { useState } from "react";
import Link from "next/link";
import DkrsShell from "../components/DkrsShell";

export default function LoginPage() {
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setLoading(true);

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: String(login || "").trim(), password: String(password || "") }),
      });

      const txt = await resp.text();
      let j = null;
      try { j = JSON.parse(txt); } catch {}

      if (!resp.ok || !j?.ok) {
        setErr(String(j?.error || "Доступ ограничен").slice(0, 300));
        return;
      }

      // success
      window.location.href = "/dashboard";
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <DkrsShell
      title="Вход"
      subtitle="AI Finance CRM — доступ по логину и паролю"
      right={
        <Link href="/dashboard" legacyBehavior>
          <a className="dkrs-link">На главную →</a>
        </Link>
      }
    >
      <div className="dkrs-auth-page">
        <div className="dkrs-card dkrs-auth-card">
          <div className="dkrs-card-header">
            <div>
              <div className="dkrs-card-title">Авторизация</div>
              <div className="dkrs-small" style={{ marginTop: 6 }}>
                Введите данные администратора.
              </div>
            </div>

            <span className="dkrs-badge" title="Secure session via cookies">
              <span className="dkrs-dot dkrs-dot-green" />
              Secure
            </span>
          </div>

          <div className="dkrs-card-body">
            <form onSubmit={onSubmit} className="dkrs-auth-form">
              <div>
                <div className="dkrs-field-label">Логин</div>
                <input
                  className="dkrs-input"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="например: admin"
                  autoComplete="username"
                />
              </div>

              <div>
                <div className="dkrs-field-label">Пароль</div>
                <input
                  className="dkrs-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div className="dkrs-auth-actions">
                <Link href="/dashboard" legacyBehavior>
                  <a className="dkrs-btn dkrs-btn-ghost">← На главную</a>
                </Link>

                <button className="dkrs-btn dkrs-btn-primary" type="submit" disabled={loading}>
                  {loading ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <span className="dkrs-spinner-sm" />
                      Входим…
                    </span>
                  ) : (
                    "Войти"
                  )}
                </button>
              </div>

              {err ? <div className="dkrs-auth-error">Доступ ограничен: {err}</div> : null}

              <div className="dkrs-auth-foot">
                Если не помнишь пароль — напиши администратору.
              </div>
            </form>
          </div>
        </div>
      </div>
    </DkrsShell>
  );
}
