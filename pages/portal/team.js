import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import DkrsAppShell from "../../components/DkrsAppShell";
import { useAuth } from "../../components/AuthProvider";

export default function TeamPage() {
  var router = useRouter();
  var auth = useAuth();
  var user = auth ? auth.user : null;
  var [employees, setEmployees] = useState([]);
  var [departments, setDepartments] = useState([]);
  var [search, setSearch] = useState("");
  var [filterDept, setFilterDept] = useState("");
  var [selectedEmployee, setSelectedEmployee] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function () { if (user) loadData(); }, [user]);

  useEffect(function () {
    if (router.query.id && employees.length > 0) {
      var emp = employees.find(function (e) { return String(e.id) === String(router.query.id); });
      if (emp) setSelectedEmployee(emp);
    }
  }, [router.query.id, employees]);

  async function loadData() {
    try {
      var res1 = await fetch("/api/portal/employees");
      var emps = await res1.json();
      if (Array.isArray(emps)) setEmployees(emps);
      var res2 = await fetch("/api/portal/departments");
      var deptData = await res2.json();
      if (deptData.departments) setDepartments(deptData.departments);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  var filtered = employees.filter(function (e) {
    if (!e.is_active) return false;
    var name = ((e.first_name || "") + " " + (e.last_name || "") + " " + (e.middle_name || "") + " " + (e.name || "") + " " + (e.email || "")).toLowerCase();
    if (search && name.indexOf(search.toLowerCase()) === -1) return false;
    if (filterDept && String(e.department_id) !== String(filterDept)) return false;
    return true;
  });

  var months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  var getInitials = function (emp) {
    if (emp.first_name && emp.last_name) return emp.last_name[0] + emp.first_name[0];
    if (emp.name) return emp.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2);
    return "?";
  };

  var getDisplayName = function (emp) {
    if (emp.first_name && emp.last_name) return emp.last_name + " " + emp.first_name + (emp.middle_name ? " " + emp.middle_name : "");
    return emp.name || emp.email;
  };

  var colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#06b6d4"];

  return (
    <DkrsAppShell>
      <div style={{ padding: "0 0 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>👥 Команда</h1>
          <div style={{ opacity: 0.5, fontSize: 14 }}>{filtered.length} сотрудников</div>
        </div>

        {/* Фильтры */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <input value={search} onChange={function (e) { setSearch(e.target.value); }}
            placeholder="🔍 Поиск по имени..."
            style={{
              flex: 1, padding: "10px 14px",
              background: "var(--input-bg, rgba(255,255,255,0.08))",
              border: "1px solid var(--card-border, rgba(255,255,255,0.15))",
              borderRadius: 10, color: "inherit", fontSize: 14, outline: "none"
            }}
          />
          <select value={filterDept} onChange={function (e) { setFilterDept(e.target.value); }}
            style={{
              padding: "10px 14px",
              background: "var(--input-bg, rgba(255,255,255,0.08))",
              border: "1px solid var(--card-border, rgba(255,255,255,0.15))",
              borderRadius: 10, color: "inherit", fontSize: 14, outline: "none"
            }}>
            <option value="">Все отделы</option>
            {departments.map(function (d) { return <option key={d.id} value={d.id}>{d.name}</option>; })}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, opacity: 0.4 }}>Загрузка...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filtered.map(function (emp, idx) {
              var color = colors[idx % colors.length];
              return (
                <div key={emp.id} onClick={function () { setSelectedEmployee(emp); }}
                  style={{
                    background: "var(--card-bg, rgba(255,255,255,0.05))",
                    border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                    borderRadius: 14, padding: "20px", cursor: "pointer",
                    transition: "all 0.2s",
                    borderLeft: "4px solid " + color
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                      background: emp.photo_url ? "url(" + emp.photo_url + ") center/cover" : "linear-gradient(135deg, " + color + ", " + color + "aa)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 700, color: "white"
                    }}>
                      {!emp.photo_url && getInitials(emp)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {getDisplayName(emp)}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
                        {emp.position_title || "Сотрудник"}
                      </div>
                      {emp.department_name && (
                        <div style={{
                          display: "inline-block", marginTop: 6,
                          padding: "2px 8px", borderRadius: 6,
                          background: color + "20", fontSize: 11, fontWeight: 600,
                          color: color
                        }}>{emp.department_name}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Модалка профиля */}
        {selectedEmployee && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20
          }} onClick={function () { setSelectedEmployee(null); }}>
            <div style={{
              background: "var(--modal-bg, #1a2332)", border: "1px solid var(--card-border, rgba(255,255,255,0.15))",
              borderRadius: 20, padding: "32px", maxWidth: 500, width: "100%",
              maxHeight: "80vh", overflowY: "auto"
            }} onClick={function (e) { e.stopPropagation(); }}>
              {/* Закрыть */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button onClick={function () { setSelectedEmployee(null); }}
                  style={{
                    background: "none", border: "none", color: "inherit",
                    fontSize: 20, cursor: "pointer", opacity: 0.5, padding: "4px 8px"
                  }}>✕</button>
              </div>

              {/* Аватар */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{
                  width: 90, height: 90, borderRadius: 22, margin: "0 auto 16px",
                  background: selectedEmployee.photo_url
                    ? "url(" + selectedEmployee.photo_url + ") center/cover"
                    : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, fontWeight: 800, color: "white"
                }}>
                  {!selectedEmployee.photo_url && getInitials(selectedEmployee)}
                </div>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>
                  {getDisplayName(selectedEmployee)}
                </h2>
                <div style={{ opacity: 0.5, fontSize: 14 }}>
                  {selectedEmployee.position_title || "Сотрудник"}
                  {selectedEmployee.department_name ? " • " + selectedEmployee.department_name : ""}
                </div>
              </div>

              {/* Детали */}
              <div style={{ display: "grid", gap: 12 }}>
                {selectedEmployee.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                    <span>📧</span>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.4 }}>Email</div>
                      <div style={{ fontSize: 14 }}>{selectedEmployee.email}</div>
                    </div>
                  </div>
                )}
                {selectedEmployee.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                    <span>📱</span>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.4 }}>Телефон</div>
                      <div style={{ fontSize: 14 }}>{selectedEmployee.phone}</div>
                    </div>
                  </div>
                )}
                {selectedEmployee.telegram && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                    <span>✈️</span>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.4 }}>Telegram</div>
                      <div style={{ fontSize: 14 }}>{selectedEmployee.telegram}</div>
                    </div>
                  </div>
                )}
                {selectedEmployee.birth_date && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                    <span>🎂</span>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.4 }}>День рождения</div>
                      <div style={{ fontSize: 14 }}>{(function () {
                        var d = new Date(selectedEmployee.birth_date);
                        return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
                      })()}</div>
                    </div>
                  </div>
                )}
                {selectedEmployee.about && (
                  <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 4 }}>📝 О себе</div>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{selectedEmployee.about}</div>
                  </div>
                )}
                {selectedEmployee.hobbies && (
                  <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 4 }}>🎯 Увлечения</div>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{selectedEmployee.hobbies}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DkrsAppShell>
  );
}
