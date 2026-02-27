import React, { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      const text = await r.text();
      let j = null;
      try { j = JSON.parse(text); } catch {}

      if (!r.ok) {
        setErr(j?.error || text || "Ошибка входа");
        return;
      }

      // куда редиректить после логина
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next || "/dashboard";
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="crm-wrap" style={{ maxWidth: 520 }}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 950 }}>Вход</div>
        <div style={{ color: "rgba(234,240,255,.7)", marginTop: 6 }}>
          AI Finance CRM — доступ по логину и паролю
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <div>
            <div className="small-muted" style={{ marginBottom: 6 }}>Логин</div>
            <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="например: admin" />
          </div>

          <div>
            <div className="small-muted" style={{ marginBottom: 6 }}>Пароль</div>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          {err ? (
            <div style={{ color: "rgba(239,68,68,.95)", fontWeight: 800, whiteSpace: "pre-wrap" }}>
              {err}
            </div>
          ) : null}

          <button className="btn primary" disabled={loading} type="submit">
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
          <Link href="/"><a className="link">← На главную</a></Link>
          <div className="small-muted">Доступ ограничен</div>
        </div>
      </div>
    </div>
  );
}
