import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import DkrsAppShell from "../../components/DkrsAppShell";
import { useAuth } from "../../components/AuthProvider";

export default function PortalHome() {
  var router = useRouter();
  var auth = useAuth();
  var user = auth ? auth.user : null;
  var [employees, setEmployees] = useState([]);
  var [departments, setDepartments] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function () {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    try {
      var res1 = await fetch("/api/portal/employees");
      var emps = await res1.json();
      if (Array.isArray(emps)) setEmployees(emps);

      var res2 = await fetch("/api/portal/departments");
      var deptData = await res2.json();
      if (deptData.departments) setDepartments(deptData.departments);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function getTodayBirthdays() {
    var today = new Date();
    var m = today.getMonth() + 1;
    var d = today.getDate();
    return employees.filter(function (e) {
      if (!e.birth_date || !e.is_active) return false;
      var bd = new Date(e.birth_date);
      return bd.getMonth() + 1 === m && bd.getDate() === d;
    });
  }

  function getUpcomingBirthdays() {
    var today = new Date();
    var upcoming = [];
    employees.forEach(function (e) {
      if (!e.birth_date || !e.is_active) return;
      var bd = new Date(e.birth_date);
      var next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      var diff = Math.floor((next - today) / (1000 * 60 * 60 * 24));
      if (diff > 0 && diff <= 30) {
        upcoming.push({ employee: e, days: diff, date: next });
      }
    });
    upcoming.sort(function (a, b) { return a.days - b.days; });
    return upcoming.slice(0, 10);
  }

  var todayBD = getTodayBirthdays();
  var upcomingBD = getUpcomingBirthdays();
  var months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var activeCount = employees.filter(function (e) { return e.is_active; }).length;
  var deptCount = departments.length;

  var getInitials = function (emp) {
    if (emp.first_name && emp.last_name) return emp.last_name[0] + emp.first_name[0];
    if (emp.name) return emp.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2);
    return "?";
  };

  var getDisplayName = function (emp) {
    if (emp.first_name && emp.last_name) return emp.first_name + " " + emp.last_name;
    return emp.name || emp.email;
  };

  return (
    <DkrsAppShell>
      <div style={{ padding: "0 0 40px" }}>
        {/* Welcome */}
        <div style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 24
        }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>
            Добро пожаловать{user ? ", " + (user.name || "").split(" ")[0] : ""}! 👋
          </h1>
          <p style={{ margin: 0, opacity: 0.6, fontSize: 15 }}>
            Корпоративный портал компании
          </p>
        </div>

        {/* Статистика */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { icon: "👥", label: "Сотрудников", value: activeCount, color: "#3b82f6" },
            { icon: "🏢", label: "Отделов", value: deptCount, color: "#8b5cf6" },
            { icon: "🎂", label: "ДР сегодня", value: todayBD.length, color: "#f59e0b" },
            { icon: "📅", label: "ДР в этом месяце", value: upcomingBD.length, color: "#10b981" }
          ].map(function (stat, i) {
            return (
              <div key={i} style={{
                background: "var(--card-bg, rgba(255,255,255,0.05))",
                border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                borderRadius: 14,
                padding: "20px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{stat.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{loading ? "—" : stat.value}</div>
                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* ДР сегодня */}
          <div style={{
            background: "var(--card-bg, rgba(255,255,255,0.05))",
            border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
            borderRadius: 16,
            padding: "24px"
          }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              🎂 Дни рождения сегодня
            </h2>
            {loading ? (
              <div style={{ opacity: 0.4, fontSize: 14, textAlign: "center", padding: 20 }}>Загрузка...</div>
            ) : todayBD.length === 0 ? (
              <div style={{ opacity: 0.4, fontSize: 14, textAlign: "center", padding: 20 }}>
                Сегодня именинников нет
              </div>
            ) : todayBD.map(function (e) {
              return (
                <div key={e.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px",
                  background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08))",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 14, marginBottom: 10,
                  cursor: "pointer"
                }} onClick={function () { router.push("/portal/team?id=" + e.id); }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: e.photo_url ? "url(" + e.photo_url + ") center/cover" : "linear-gradient(135deg, #f59e0b, #ef4444)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 700, color: "white"
                  }}>
                    {!e.photo_url && getInitials(e)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>🎉 {getDisplayName(e)}</div>
                    <div style={{ opacity: 0.5, fontSize: 12, marginTop: 2 }}>
                      {e.position_title || ""}{e.department_name ? " • " + e.department_name : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ближайшие ДР */}
          <div style={{
            background: "var(--card-bg, rgba(255,255,255,0.05))",
            border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
            borderRadius: 16,
            padding: "24px"
          }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              📅 Ближайшие дни рождения
            </h2>
            {loading ? (
              <div style={{ opacity: 0.4, fontSize: 14, textAlign: "center", padding: 20 }}>Загрузка...</div>
            ) : upcomingBD.length === 0 ? (
              <div style={{ opacity: 0.4, fontSize: 14, textAlign: "center", padding: 20 }}>
                Нет данных о днях рождения
              </div>
            ) : upcomingBD.map(function (item) {
              var bd = new Date(item.employee.birth_date);
              return (
                <div key={item.employee.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--card-border, rgba(255,255,255,0.06))",
                  cursor: "pointer"
                }} onClick={function () { router.push("/portal/team?id=" + item.employee.id); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: item.employee.photo_url ? "url(" + item.employee.photo_url + ") center/cover" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: "white"
                    }}>
                      {!item.employee.photo_url && getInitials(item.employee)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{getDisplayName(item.employee)}</div>
                      <div style={{ fontSize: 12, opacity: 0.4 }}>
                        {bd.getDate()} {months[bd.getMonth()]}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: "3px 10px",
                    background: item.days <= 3 ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.12)",
                    border: "1px solid " + (item.days <= 3 ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.2)"),
                    borderRadius: 8, fontSize: 12, fontWeight: 600,
                    color: item.days <= 3 ? "#fca5a5" : "#93c5fd"
                  }}>
                    {item.days === 1 ? "завтра" : "через " + item.days + " дн."}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DkrsAppShell>
  );
}
