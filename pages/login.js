import React, { useState } from "react";
import { useAuth } from "../components/AuthProvider";
import Link from "next/link";

export default function LoginPage() {
  var auth = useAuth();
  var _login = useState(""), login = _login[0], setLogin = _login[1];
  var _password = useState(""), password = _password[0], setPassword = _password[1];
  var _loading = useState(false), loading = _loading[0], setLoading = _loading[1];
  var _error = useState(""), error = _error[0], setError = _error[1];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.login(login, password);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">D</span>
          <span className="auth-logo-text">DKRS</span>
        </div>
        <h1 className="auth-title">Вход в систему</h1>
        <p className="auth-subtitle">Финансовая аналитика вашего бизнеса</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>👤 Логин или Email</label>
            <input type="text" placeholder="admin или email@example.com" value={login}
              onChange={function (e) { setLogin(e.target.value); }} required />
          </div>
          <div className="auth-field">
            <label>🔒 Пароль</label>
            <input type="password" placeholder="••••••" value={password}
              onChange={function (e) { setPassword(e.target.value); }} required />
          </div>

          {error && <div className="auth-error">⚠️ {error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Входим..." : "Войти →"}
          </button>
        </form>

        <div className="auth-footer">
          Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
}
