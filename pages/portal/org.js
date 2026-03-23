import { useState, useEffect } from "react";
import DkrsAppShell from "../../components/DkrsAppShell";
import { useAuth } from "../../components/AuthProvider";

export default function OrgPage() {
  var auth = useAuth();
  var user = auth ? auth.user : null;
  var [departments, setDepartments] = useState([]);
  var [positions, setPositions] = useState([]);
  var [employees, setEmployees] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function () { if (user) loadData(); }, [user]);

  async function loadData() {
    try {
      var res1 = await fetch("/api/portal/departments");
      var data1 = await res1.json();
      if (data1.departments) setDepartments(data1.departments);
      if (data1.positions) setPositions(data1.positions);

      var res2 = await fetch("/api/portal/employees");
      var emps = await res2.json();
      if (Array.isArray(emps)) setEmployees(emps.filter(function (e) { return e.is_active; }));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  var getInitials = function (emp) {
    if (emp.first_name && emp.last_name) return emp.last_name[0] + emp.first_name[0];
    if (emp.name) return emp.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2);
    return "?";
  };

  var getDisplayName = function (emp) {
    if (emp.first_name && emp.last_name) return emp.first_name + " " + emp.last_name;
    return emp.name || emp.email;
  };

  var colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#06b6d4"];

  // Группируем по отделам
  var deptMap = {};
  departments.forEach(function (d, idx) {
    deptMap[d.id] = {
      dept: d,
      color: colors[idx % colors.length],
      positions: [],
      employees: []
    };
  });

  positions.forEach(function (p) {
    if (deptMap[p.department_id]) {
      deptMap[p.department_id].positions.push(p);
    }
  });

  employees.forEach(function (e) {
    if (e.department_id && deptMap[e.department_id]) {
      deptMap[e.department_id].employees.push(e);
    }
  });

  var noDepEmployees = employees.filter(function (e) { return !e.department_id; });

  return (
    <DkrsAppShell>
      <div style={{ padding: "0 0 40px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>🏗️ Организационная структура</h1>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, opacity: 0.4 }}>Загрузка...</div>
        ) : departments.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 60,
            background: "var(--card-bg, rgba(255,255,255,0.05))",
            border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
            borderRadius: 16
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Структура пока не настроена</div>
            <div style={{ opacity: 0.5, fontSize: 14 }}>Администратор может добавить отделы и должности в разделе "Управление"</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {Object.keys(deptMap).map(function (deptId) {
              var item = deptMap[deptId];
              var dept = item.dept;
              var deptPositions = item.positions;
              var deptEmployees = item.employees;
              var color = item.color;

              // Руководитель отдела
              var headPosition = deptPositions.find(function (p) { return p.is_head; });
              var head = null;
              if (headPosition) {
                head = deptEmployees.find(function (e) { return e.position_id === headPosition.id; });
              }

              return (
                <div key={deptId} style={{
                  background: "var(--card-bg, rgba(255,255,255,0.05))",
                  border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                  borderRadius: 16, overflow: "hidden"
                }}>
                  {/* Заголовок отдела */}
                  <div style={{
                    padding: "20px 24px",
                    background: color + "15",
                    borderBottom: "1px solid " + color + "30",
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div>
                      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: color }}>
                        {dept.name}
                      </h2>
                      <div style={{ fontSize: 13, opacity: 0.5 }}>
                        {deptEmployees.length} сотрудников • {deptPositions.length} должностей
                      </div>
                    </div>
                    {head && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 14px", background: "rgba(255,255,255,0.08)",
                        borderRadius: 10
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: head.photo_url ? "url(" + head.photo_url + ") center/cover" : "linear-gradient(135deg, " + color + ", " + color + "aa)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: "white"
                        }}>{!head.photo_url && getInitials(head)}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{getDisplayName(head)}</div>
                          <div style={{ fontSize: 11, opacity: 0.4 }}>Руководитель</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Сотрудники */}
                  <div style={{ padding: "16px 24px" }}>
                    {deptEmployees.length === 0 ? (
                      <div style={{ opacity: 0.4, fontSize: 13, textAlign: "center", padding: 16 }}>
                        Нет сотрудников
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                        {deptEmployees.map(function (emp) {
                          return (
                            <div key={emp.id} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "10px 12px", borderRadius: 10,
                              background: "rgba(255,255,255,0.03)"
                            }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: emp.photo_url ? "url(" + emp.photo_url + ") center/cover" : "linear-gradient(135deg, " + color + "88, " + color + "55)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 700, color: "white"
                              }}>{!emp.photo_url && getInitials(emp)}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {getDisplayName(emp)}
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.4 }}>
                                  {emp.position_title || "Сотрудник"}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Без отдела */}
            {noDepEmployees.length > 0 && (
              <div style={{
                background: "var(--card-bg, rgba(255,255,255,0.05))",
                border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                borderRadius: 16, overflow: "hidden"
              }}>
                <div style={{
                  padding: "20px 24px",
                  background: "rgba(255,255,255,0.03)",
                  borderBottom: "1px solid var(--card-border, rgba(255,255,255,0.08))"
                }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, opacity: 0.5 }}>
                    Без отдела
                  </h2>
                </div>
                <div style={{ padding: "16px 24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {noDepEmployees.map(function (emp) {
                      return (
                        <div key={emp.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", borderRadius: 10,
                          background: "rgba(255,255,255,0.03)"
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: "linear-gradient(135deg, #64748b88, #64748b55)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: "white"
                          }}>{getInitials(emp)}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{getDisplayName(emp)}</div>
                            <div style={{ fontSize: 11, opacity: 0.4 }}>{emp.position_title || "Сотрудник"}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DkrsAppShell>
  );
}
