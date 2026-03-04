// pages/login.js
import React, { useState } from "react";
import { useRouter } from "next/router";
import { fetchJson } from "../lib/dkrsClient";

const LOGIN_ENDPOINT = "/api/auth/login";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");

    try {
      await fetchJson(LOGIN_ENDPOINT, { method: "POST", body: { email, password } });
      router.push("/dashboard");
    } catch (e2) {
      setErr(e2?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dkrs-bg" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 18 }}>
      <div className="glass strong" style={{ width: "min(980px, 100%)", padding: 18, overflow: "hidden" }}>
        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(148,163,184,0.26)",
            background:
              "radial-gradient(520px 240px at 20% 20%, rgba(167,139,250,0.35), transparent 60%)," +
              "radial-gradient(520px 240px at 80% 70%, rgba(20,184,166,0.22), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.45))",
            padding: 18,
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="dkrs-brandMark" style={{ width: 38, height: 38, borderRadius: 16 }} />
              <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 20 }}>DKRS</div>
            </div>

            <div className="dkrs-sub" style={{ marginTop: 10, maxWidth: 520 }}>
              AI Finance CRM — единый дашборд, отчёты и AI помощник в одном месте.
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="badge ok"><span className="dot" /> Light</span>
              <span className="badge"><span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} /> Glass UI</span>
              <span className="badge"><span className="dot" style={{ background: "rgba(20,184,166,0.9)" }} /> Enterprise</span>
            </div>

            <div style={{ marginTop: 18 }}>
              <img
                src="/robot-assistant.svg"
                alt="Assistant"
                style={{
                  width: 220,
                  maxWidth: "100%",
                  filter: "drop-shadow(0 24px 40px rgba(15,23,42,0.18))",
                }}
              />
            </div>
          </div>

          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(148,163,184,0.26)",
              background: "rgba(255,255,255,0.62)",
              boxShadow: "0 18px 60px rgba(15,23,42,0.10)",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 18 }}>Вход</div>
            <div className="dkrs-sub" style={{ marginTop: 6 }}>Введите данные доступа</div>

            <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <input
                className="input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <input
                className="input"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
              />

              {err ? (
                <div style={{ color: "rgba(251,113,133,0.95)", fontWeight: 900, fontSize: 13 }}>
                  {err}
                </div>
              ) : null}

              <button className="btn" disabled={loading} type="submit">
                {loading ? "Входим…" : "Войти"}
              </button>

              <button
                className="btn ghost"
                type="button"
                onClick={() => router.push("/dashboard")}
                title="Если у тебя уже есть сессия, можно перейти"
              >
                Перейти в дашборд
              </button>
            </form>
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 980px) {
            div[style*="grid-template-columns: 1.05fr 0.95fr"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
