import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Login() {
  var router = useRouter();
  var [email, setEmail] = useState("");
  var [password, setPassword] = useState("");
  var [error, setError] = useState("");
  var [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      var res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: email, password: password })
      });
      var data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка входа");
        setLoading(false);
        return;
      }
      localStorage.setItem("portal_token", data.token);
      localStorage.setItem("portal_user", JSON.stringify(data.user));
      router.push("/portal");
    } catch (err) {
      setError("Ошибка сервера");
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Вход — Корпоративный портал</title>
      </Head>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d2137 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: "20px"
      }}>
        <div style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "48px 40px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)"
        }}>
          {/* Логотип */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 32
            }}>
              🏢
            </div>
            <h1 style={{
              color: "white",
              fontSize: 24,
              fontWeight: 700,
              margin: "0 0 8px"
            }}>Корпоративный портал</h1>
            <p style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 14,
              margin: 0
            }}>Войдите в свой аккаунт</p>
          </div>

          <form onSubmit={handleLogin}>
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
                color: "#fca5a5",
                fontSize: 14,
                textAlign: "center"
              }}>{error}</div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                color: "rgba(255,255,255,0.7)",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 8
              }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={function(e) { setEmail(e.target.value); }}
                placeholder="your@email.com"
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  color: "white",
                  fontSize: 15,
                  outline: "none",
                  transition: "border 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={function(e) { e.target.style.borderColor = "#3b82f6"; }}
                onBlur={function(e) { e.target.style.borderColor = "rgba(255,255,255,0.15)"; }}
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{
                display: "block",
                color: "rgba(255,255,255,0.7)",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 8
              }}>Пароль</label>
              <input
                type="password"
                value={password}
                onChange={function(e) { setPassword(e.target.value); }}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  color: "white",
                  fontSize: 15,
                  outline: "none",
                  transition: "border 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={function(e) { e.target.style.borderColor = "#3b82f6"; }}
                onBlur={function(e) { e.target.style.borderColor = "rgba(255,255,255,0.15)"; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading ? "rgba(59,130,246,0.5)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                color: "white",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: "0 4px 15px rgba(59,130,246,0.4)"
              }}
            >{loading ? "Вход..." : "Войти"}</button>
          </form>
        </div>
      </div>
    </>
  );
}
