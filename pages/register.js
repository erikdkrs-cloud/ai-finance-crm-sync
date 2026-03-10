import React, { useState } from "react";
import { useAuth } from "../components/AuthProvider";
import Link from "next/link";

export default function RegisterPage() {
  var auth = useAuth();
  var _name = useState(""), name = _name[0], setName = _name[1];
  var _email = useState(""), email = _email[0], setEmail = _email[1];
  var _password = useState(""), password = _password[0], setPassword = _password[1];
  var _password2 = useState(""), password2 = _password2[0], setPassword2 = _password2[1];
  var _loading = useState(false), loading = _loading[0], setLoading = _loading[1];
  var _error = useState(""), error = _error[0], setError = _error[1];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== password2) { setError("Пароли не совпадают"); return; }
    if (password.length < 6) { setError("Пароль минимум 6 символов"); return; }
    setLoading(true);
    try {
      await auth.register(email, password, name);
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
        <h1 className="auth-title">Регистрация</h1>
        <p className="auth-subtitle">Создайте аккаунт для доступа к системе</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>👤 Имя</label>
            <input type="text" placeholder="Ваше имя" value={name}
              onChange={function (e) { setName(e.target.value); }} required />
          </div>
          <div className="auth-field">
            <label>📧 Email</label>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={function (e) { setEmail(e.target.value); }} required />
          </div>
          <div className="auth-field">
            <label>🔒 Пароль</label>
            <input type="password" placeholder="Минимум 6 символов" value={password}
              onChange={function (e) { setPassword(e.target.value); }} required />
          </div>
          <div className="auth-field">
            <label>🔒 Повторите пароль</label>
            <input type="password" placeholder="Повторите пароль" value={password2}
              onChange={function (e) { setPassword2(e.target.value); }} required />
          </div>

          {error && <div className="auth-error">⚠️ {error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Создаём..." : "Создать аккаунт →"}
          </button>
        </form>

        <div className="auth-footer">
          Уже есть аккаунт? <Link href="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
}
