import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка входа");
      router.push("/dashboard");
    } catch (e2) {
      setErr(e2?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`login-page ${mounted ? "mounted" : ""}`}>
      <div className="login-container">
        {/* Left side */}
        <div className="login-hero">
          <div className="login-logo">
            <div className="login-logo-icon">D</div>
            <span className="login-logo-text">DKRS</span>
          </div>

          <h1 className="login-hero-title">AI Finance CRM</h1>
          <p className="login-hero-desc">
            Единый дашборд, отчёты и AI помощник в одном месте
          </p>

          <div className="login-badges">
            <span className="login-badge green">
              <span className="login-badge-dot" style={{ background: "#10b981" }} />
              Light
            </span>
            <span className="login-badge violet">
              <span className="login-badge-dot" style={{ background: "#a78bfa" }} />
              Glass UI
            </span>
            <span className="login-badge teal">
              <span className="login-badge-dot" style={{ background: "#14b8a6" }} />
              Enterprise
            </span>
          </div>

          <div className="login-hero-visual">
            <div className="login-robot">🤖</div>
            <div className="login-glow-1" />
            <div className="login-glow-2" />
          </div>
        </div>

        {/* Right side — form */}
        <div className="login-form-card">
          <div className="login-form-header">
            <h2>Вход</h2>
            <p>Введите данные доступа</p>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-field">
              <label>Email</label>
              <input
                type="email"
                className="dkrs-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label>Пароль</label>
              <input
                type="password"
                className="dkrs-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {err && <div className="login-error">{err}</div>}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <><span className="login-spinner" /> Входим...</>
              ) : (
                "Войти"
              )}
            </button>

            <button
              type="button"
              className="login-skip-btn"
              onClick={() => router.push("/dashboard")}
            >
              Перейти в дашборд →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
