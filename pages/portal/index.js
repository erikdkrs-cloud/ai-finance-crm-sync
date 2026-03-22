import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Portal() {
  var router = useRouter();
  var [user, setUser] = useState(null);
  var [employees, setEmployees] = useState([]);
  var [loading, setLoading] = useState(true);
  var [activeTab, setActiveTab] = useState("home");

  useEffect(function() {
    checkAuth();
  }, []);

  async function checkAuth() {
    var token = localStorage.getItem("portal_token");
    if (!token) { router.push("/portal/login"); return; }
    try {
      var res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "me", token: token })
      });
      if (!res.ok) { localStorage.removeItem("portal_token"); router.push("/portal/login"); return; }
      var data = await res.json();
      setUser(data.user);
      loadEmployees(token);
    } catch(e) { router.push("/portal/login"); }
  }

  async function loadEmployees(token) {
    try {
      var res = await fetch("/api/portal/employees", {
        headers: { "Authorization": "Bearer " + token }
      });
      var data = await res.json();
      setEmployees(data);
    } catch(e) {}
    setLoading(false);
  }

  function logout() {
    var token = localStorage.getItem("portal_token");
    fetch("/api/portal/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout", token: token })
    });
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_user");
    router.push("/portal/login");
  }

  function getTodayBirthdays() {
    var today = new Date();
    var m = today.getMonth() + 1;
    var d = today.getDate();
    return employees.filter(function(e) {
      if (!e.birth_date) return false;
      var bd = new Date(e.birth_date);
      return bd.getMonth() + 1 === m && bd.getDate() === d;
    });
  }

  function getUpcomingBirthdays() {
    var today = new Date();
    var upcoming = [];
    employees.forEach(function(e) {
      if (!e.birth_date) return;
      var bd = new Date(e.birth_date);
      var next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      var diff = Math.floor((next - today) / (1000 * 60 * 60 * 24));
      if (diff > 0 && diff <= 30) {
        upcoming.push({ employee: e, days: diff, date: next });
      }
    });
    upcoming.sort(function(a, b) { return a.days - b.days; });
    return upcoming.slice(0, 10);
  }

  if (loading) return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1628, #1a2d4a)",
      display: "flex", alignItems: "center", justifyContent: "center", color: "white"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <div>Загрузка...</div>
      </div>
    </div>
  );

  if (!user) return null;

  var todayBD = getTodayBirthdays();
  var upcomingBD = getUpcomingBirthdays();
  var months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

  return (
    <>
      <Head>
        <title>Корпоративный портал</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d2137 100%)",
        fontFamily: "'Inter', sans-serif",
        color: "white"
      }}>
        {/* Header */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
            }}>🏢</div>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Портал</span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "home", icon: "🏠", label: "Главная" },
              { id: "profile", icon: "👤", label: "Профиль" },
              { id: "org", icon: "🏗️", label: "Структура" },
              { id: "team", icon: "👥", label: "Команда" }
            ].concat(user.role === "admin" ? [{ id: "admin", icon: "⚙️", label: "Админ" }] : []).map(function(tab) {
              return (
                <button key={tab.id} onClick={function() {
                  if (tab.id === "profile") router.push("/portal/profile");
                  else if (tab.id === "org") router.push("/portal/org");
                  else if (tab.id === "admin") router.push("/portal/admin");
                  else setActiveTab(tab.id);
                }} style={{
                  padding: "8px 16px",
                  background: activeTab === tab.id ? "rgba(59,130,246,0.2)" : "transparent",
                  border: activeTab === tab.id ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                  borderRadius: 10,
                  color: activeTab === tab.id ? "#60a5fa" : "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  display: "flex", alignItems: "center", gap: 6
                }}>
                  <span>{tab.icon}</span>{tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{user.first_name} {user.last_name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{user.position_title || user.role}</div>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: user.photo_url ? "none" : "linear-gradient(135deg, #f59e0b, #ef4444)",
              backgroundImage: user.photo_url ? "url(" + user.photo_url + ")" : "none",
              backgroundSize: "cover", backgroundPosition: "center",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: "white"
            }}>
              {!user.photo_url && (user.first_name || "?")[0]}
            </div>
            <button onClick={logout} style={{
              padding: "8px 12px", background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10,
              color: "#fca5a5", cursor: "pointer", fontSize: 12
            }}>Выйти</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>
          {/* Welcome */}
          <div style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 20,
            padding: "32px 40px",
            marginBottom: 32
          }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800 }}>
              Добро пожаловать, {user.first_name}! 👋
            </h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: 16 }}>
              {user.department_name ? user.department_name + " • " : ""}{user.position_title || "Сотрудник"}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Дни рождения сегодня */}
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "28px"
            }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
                🎂 Дни рождения сегодня
              </h2>
              {todayBD.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", padding: 20 }}>
                  Сегодня именинников нет
                </div>
              ) : todayBD.map(function(e) {
                return (
                  <div key={e.id} style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "16px",
                    background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))",
                    border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: 16, marginBottom: 12
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 16,
                      background: e.photo_url ? "none" : "linear-gradient(135deg, #f59e0b, #ef4444)",
                      backgroundImage: e.photo_url ? "url(" + e.photo_url + ")" : "none",
                      backgroundSize: "cover", backgroundPosition: "center",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, fontWeight: 700
                    }}>
                      {!e.photo_url && (e.first_name || "?")[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        🎉 {e.first_name} {e.last_name}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                        {e.position_title || ""} {e.department_name ? "• " + e.department_name : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ближайшие */}
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "28px"
            }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
                📅 Ближайшие дни рождения
              </h2>
              {upcomingBD.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", padding: 20 }}>
                  Нет данных о днях рождения
                </div>
              ) : upcomingBD.map(function(item) {
                var bd = new Date(item.employee.birth_date);
                return (
                  <div key={item.employee.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: item.employee.photo_url ? "none" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                        backgroundImage: item.employee.photo_url ? "url(" + item.employee.photo_url + ")" : "none",
                        backgroundSize: "cover", backgroundPosition: "center",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700
                      }}>
                        {!item.employee.photo_url && (item.employee.first_name || "?")[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {item.employee.first_name} {item.employee.last_name}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                          {bd.getDate()} {months[bd.getMonth()]}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: "4px 12px",
                      background: item.days <= 3 ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.15)",
                      border: "1px solid " + (item.days <= 3 ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.2)"),
                      borderRadius: 8,
                      fontSize: 12,
                      color: item.days <= 3 ? "#fca5a5" : "#93c5fd"
                    }}>
                      через {item.days} дн.
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Статистика */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 24
          }}>
            {[
              { icon: "👥", label: "Сотрудников", value: employees.filter(function(e){ return e.is_active; }).length, color: "#3b82f6" },
              { icon: "🏢", label: "Отделов", value: new Set(employees.map(function(e){ return e.department_id; }).filter(Boolean)).size, color: "#8b5cf6" },
              { icon: "🎂", label: "Дней рождений сегодня", value: todayBD.length, color: "#f59e0b" },
              { icon: "📅", label: "В ближайший месяц", value: upcomingBD.length, color: "#10b981" }
            ].map(function(stat, i) {
              return (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16, padding: "24px", textAlign: "center"
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{stat.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
