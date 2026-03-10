import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  var router = useRouter();
  var _l = useState(""), login = _l[0], setLogin = _l[1];
  var _p = useState(""), password = _p[0], setPassword = _p[1];
  var _lo = useState(false), loading = _lo[0], setLoading = _lo[1];
  var _e = useState(""), err = _e[0], setErr = _e[1];
  var _m = useState(false), mounted = _m[0], setMounted = _m[1];

  useEffect(function () { setMounted(true); }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      var res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login, password: password }),
        credentials: "include",
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка входа");
      router.push("/dashboard");
    } catch (e2) {
      setErr(e2.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  function skipLogin() {
    router.push("/dashboard");
  }

  return (
    <div className={"login-page" + (mounted ? " mounted" : "")}>
      <div className="login-container">
        <div className="login-hero">
          <div className="login-logo">
            <div className="login-logo-icon">D</div>
            <span className="login-logo-text">DKRS</span>
          </div>
          <h1 className="login-hero-title">AI Finance CRM</h1>
          <p className="login-hero-desc">Единый дашборд, отчёты и AI помощник в одном месте</p>
          <div className="login-badges">
            <span className="login-badge">
              <span className="login-badge-dot" style={{ background: "#10b981" }} />
              Light
            </span>
            <span className="login-badge">
              <span className="login-badge-dot" style={{ background: "#a78bfa" }} />
              Glass UI
            </span>
            <span className="login-badge">
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

        <div className="login-form-card">
          <div className="login-form-header">
            <h2>Вход</h2>
            <p>Введите логин и пароль</p>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-field">
              <label>Логин</label>
              <input
                type="text"
                className="dkrs-input"
                placeholder="admin"
                value={login}
                onChange={function (e) { setLogin(e.target.value); }}
                autoComplete="username"
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
                onChange={function (e) { setPassword(e.target.value); }}
                autoComplete="current-password"
                required
              />
            </div>

            {err && <div className="login-error">{err}</div>}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? (
                <span><span className="login-spinner" /> Входим...</span>
              ) : (
                "Войти"
              )}
            </button>

            <button type="button" className="login-skip-btn" onClick={skipLogin}>
              Перейти в дашборд →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
