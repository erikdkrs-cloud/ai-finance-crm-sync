import { useState, useEffect } from "react";
import DkrsAppShell from "../../components/DkrsAppShell";

export default function PortalAdmin() {
  var _tab = useState("departments"), tab = _tab[0], setTab = _tab[1];
  var _depts = useState([]), depts = _depts[0], setDepts = _depts[1];
  var _positions = useState([]), positions = _positions[0], setPositions = _positions[1];
  var _employees = useState([]), employees = _employees[0], setEmployees = _employees[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _msg = useState(null), msg = _msg[0], setMsg = _msg[1];

  // Forms
  var _deptName = useState(""), deptName = _deptName[0], setDeptName = _deptName[1];
  var _deptHead = useState(""), deptHead = _deptHead[0], setDeptHead = _deptHead[1];
  var _posTitle = useState(""), posTitle = _posTitle[0], setPosTitle = _posTitle[1];
  var _posDept = useState(""), posDept = _posDept[0], setPosDept = _posDept[1];
  var _editingDept = useState(null), editingDept = _editingDept[0], setEditingDept = _editingDept[1];
  var _editingPos = useState(null), editingPos = _editingPos[0], setEditingPos = _editingPos[1];

  // Employee assignment
  var _assignEmp = useState(""), assignEmp = _assignEmp[0], setAssignEmp = _assignEmp[1];
  var _assignDept = useState(""), assignDept = _assignDept[0], setAssignDept = _assignDept[1];
  var _assignPos = useState(""), assignPos = _assignPos[0], setAssignPos = _assignPos[1];

  useEffect(function () { loadAll(); }, []);

  function loadAll() {
    setLoading(true);
    Promise.all([
      fetch("/api/portal/departments").then(function (r) { return r.json(); }),
      fetch("/api/portal/positions").then(function (r) { return r.json(); }),
      fetch("/api/portal/employees").then(function (r) { return r.json(); })
    ]).then(function (res) {
      if (res[0].departments) setDepts(res[0].departments);
      if (res[1].positions) setPositions(res[1].positions);
      if (res[2].employees) setEmployees(res[2].employees);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }

  function showMsg(text, isError) {
    setMsg({ text: text, error: isError });
    setTimeout(function () { setMsg(null); }, 3000);
  }

  // === DEPARTMENTS ===
  function addDept() {
    if (!deptName.trim()) return;
    fetch("/api/portal/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: deptName.trim(), head_employee_id: deptHead || null })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) return showMsg(d.error, true);
      showMsg("Отдел создан!");
      setDeptName(""); setDeptHead("");
      loadAll();
    });
  }

  function updateDept(id) {
    if (!editingDept) return;
    fetch("/api/portal/departments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, name: editingDept.name, head_employee_id: editingDept.head_employee_id })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) return showMsg(d.error, true);
      showMsg("Отдел обновлён!");
      setEditingDept(null);
      loadAll();
    });
  }

  function deleteDept(id) {
    if (!confirm("Удалить отдел?")) return;
    fetch("/api/portal/departments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) return showMsg(d.error, true);
      showMsg("Отдел удалён!");
      loadAll();
    });
  }

  // === POSITIONS ===
  function addPosition() {
    if (!posTitle.trim()) return;
    fetch("/api/portal/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: posTitle.trim(), department_id: posDept || null })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) return showMsg(d.error, true);
      showMsg("Должность создана!");
      setPosTitle(""); setPosDept("");
      loadAll();
    });
  }

  function deletePosition(id) {
    if (!confirm("Удалить должность?")) return;
    fetch("/api/portal/positions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) return showMsg(d.error, true);
      showMsg("Должность удалена!");
      loadAll();
    });
  }

  // === ASSIGN EMPLOYEE ===
  function assignEmployee() {
    if (!assignEmp) return;
    fetch("/api/portal/employees", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: assignEmp,
        department_id: assignDept || null,
        position_id: assignPos || null
      })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) return showMsg(d.error, true);
      showMsg("Сотрудник обновлён!");
      setAssignEmp(""); setAssignDept(""); setAssignPos("");
      loadAll();
    });
  }

  function getDeptName(id) {
    var d = depts.find(function (x) { return x.id === id; });
    return d ? d.name : "—";
  }
  function getPosTitle(id) {
    var p = positions.find(function (x) { return x.id === id; });
    return p ? p.title : "—";
  }
  function getEmpName(id) {
    var e = employees.find(function (x) { return x.id === id; });
    return e ? (e.last_name + " " + e.first_name) : "—";
  }

  return React.createElement(DkrsAppShell, { activePage: "portal-admin" },
    React.createElement("div", { className: "pa-page" },

      // Header
      React.createElement("div", { className: "pa-header" },
        React.createElement("div", null,
          React.createElement("h1", { className: "pa-title" }, "⚙️ Управление порталом"),
          React.createElement("p", { className: "pa-subtitle" }, "Отделы, должности, назначения сотрудников")
        )
      ),

      // Message
      msg && React.createElement("div", {
        className: "dm-msg" + (msg.error ? " error" : ""),
        style: { marginBottom: 16 }
      }, msg.text),

      // Tabs
      React.createElement("div", { className: "pa-tabs" },
        ["departments", "positions", "assign"].map(function (t) {
          var labels = { departments: "🏢 Отделы", positions: "💼 Должности", assign: "👤 Назначения" };
          return React.createElement("button", {
            key: t,
            className: "pa-tab" + (tab === t ? " active" : ""),
            onClick: function () { setTab(t); }
          }, labels[t]);
        })
      ),

      loading ? React.createElement("div", { className: "dm-loading" },
        React.createElement("div", { className: "loader-spinner" }), "Загрузка..."
      ) :

      // === TAB: DEPARTMENTS ===
      tab === "departments" ? React.createElement("div", { className: "pa-section" },

        // Add form
        React.createElement("div", { className: "pa-form-card glass-card" },
          React.createElement("h3", null, "Добавить отдел"),
          React.createElement("div", { className: "pa-form-row" },
            React.createElement("input", {
              className: "dkrs-input", placeholder: "Название отдела",
              value: deptName, onChange: function (e) { setDeptName(e.target.value); }
            }),
            React.createElement("select", {
              className: "dkrs-select", value: deptHead,
              onChange: function (e) { setDeptHead(e.target.value); }
            },
              React.createElement("option", { value: "" }, "Руководитель (опционально)"),
              employees.map(function (emp) {
                return React.createElement("option", { key: emp.id, value: emp.id },
                  emp.last_name + " " + emp.first_name
                );
              })
            ),
            React.createElement("button", {
              className: "import-btn primary", onClick: addDept,
              disabled: !deptName.trim()
            }, "+ Создать")
          )
        ),

        // List
        React.createElement("div", { className: "pa-list" },
          depts.length === 0 ?
            React.createElement("div", { className: "dm-empty" },
              React.createElement("div", { className: "dm-empty-icon" }, "🏢"),
              React.createElement("p", null, "Нет отделов. Создайте первый!")
            ) :
            depts.map(function (dept) {
              var isEditing = editingDept && editingDept.id === dept.id;
              var empCount = employees.filter(function (e) { return e.department_id === dept.id; }).length;

              return React.createElement("div", {
                key: dept.id, className: "pa-card glass-card" + (isEditing ? " editing" : "")
              },
                isEditing ?
                  // Edit mode
                  React.createElement("div", { className: "pa-card-edit" },
                    React.createElement("input", {
                      className: "dkrs-input", value: editingDept.name,
                      onChange: function (e) { setEditingDept(Object.assign({}, editingDept, { name: e.target.value })); }
                    }),
                    React.createElement("select", {
                      className: "dkrs-select", value: editingDept.head_employee_id || "",
                      onChange: function (e) { setEditingDept(Object.assign({}, editingDept, { head_employee_id: e.target.value || null })); }
                    },
                      React.createElement("option", { value: "" }, "Без руководителя"),
                      employees.map(function (emp) {
                        return React.createElement("option", { key: emp.id, value: emp.id },
                          emp.last_name + " " + emp.first_name
                        );
                      })
                    ),
                    React.createElement("div", { className: "pa-card-actions" },
                      React.createElement("button", {
                        className: "import-btn primary",
                        onClick: function () { updateDept(dept.id); }
                      }, "💾 Сохранить"),
                      React.createElement("button", {
                        className: "import-btn secondary",
                        onClick: function () { setEditingDept(null); }
                      }, "Отмена")
                    )
                  ) :
                  // View mode
                  React.createElement("div", { className: "pa-card-view" },
                    React.createElement("div", { className: "pa-card-info" },
                      React.createElement("div", { className: "pa-card-icon" }, "🏢"),
                      React.createElement("div", null,
                        React.createElement("div", { className: "pa-card-name" }, dept.name),
                        React.createElement("div", { className: "pa-card-meta" },
                          "👤 Руководитель: " + (dept.head_employee_id ? getEmpName(dept.head_employee_id) : "не назначен") +
                          " · 👥 " + empCount + " сотр."
                        )
                      )
                    ),
                    React.createElement("div", { className: "pa-card-actions" },
                      React.createElement("button", {
                        className: "users-action-btn edit", title: "Редактировать",
                        onClick: function () { setEditingDept({ id: dept.id, name: dept.name, head_employee_id: dept.head_employee_id }); }
                      }, "✏️"),
                      React.createElement("button", {
                        className: "users-action-btn delete", title: "Удалить",
                        onClick: function () { deleteDept(dept.id); }
                      }, "🗑️")
                    )
                  )
              );
            })
        )
      ) :

      // === TAB: POSITIONS ===
      tab === "positions" ? React.createElement("div", { className: "pa-section" },

        // Add form
        React.createElement("div", { className: "pa-form-card glass-card" },
          React.createElement("h3", null, "Добавить должность"),
          React.createElement("div", { className: "pa-form-row" },
            React.createElement("input", {
              className: "dkrs-input", placeholder: "Название должности",
              value: posTitle, onChange: function (e) { setPosTitle(e.target.value); }
            }),
            React.createElement("select", {
              className: "dkrs-select", value: posDept,
              onChange: function (e) { setPosDept(e.target.value); }
            },
              React.createElement("option", { value: "" }, "Отдел (опционально)"),
              depts.map(function (d) {
                return React.createElement("option", { key: d.id, value: d.id }, d.name);
              })
            ),
            React.createElement("button", {
              className: "import-btn primary", onClick: addPosition,
              disabled: !posTitle.trim()
            }, "+ Создать")
          )
        ),

        // List
        React.createElement("div", { className: "pa-list" },
          positions.length === 0 ?
            React.createElement("div", { className: "dm-empty" },
              React.createElement("div", { className: "dm-empty-icon" }, "💼"),
              React.createElement("p", null, "Нет должностей. Создайте первую!")
            ) :
            positions.map(function (pos) {
              return React.createElement("div", { key: pos.id, className: "pa-card glass-card" },
                React.createElement("div", { className: "pa-card-view" },
                  React.createElement("div", { className: "pa-card-info" },
                    React.createElement("div", { className: "pa-card-icon" }, "💼"),
                    React.createElement("div", null,
                      React.createElement("div", { className: "pa-card-name" }, pos.title),
                      React.createElement("div", { className: "pa-card-meta" },
                        "🏢 " + (pos.department_id ? getDeptName(pos.department_id) : "без отдела")
                      )
                    )
                  ),
                  React.createElement("div", { className: "pa-card-actions" },
                    React.createElement("button", {
                      className: "users-action-btn delete", title: "Удалить",
                      onClick: function () { deletePosition(pos.id); }
                    }, "🗑️")
                  )
                )
              );
            })
        )
      ) :

      // === TAB: ASSIGN ===
      React.createElement("div", { className: "pa-section" },

        // Assign form
        React.createElement("div", { className: "pa-form-card glass-card" },
          React.createElement("h3", null, "Назначить сотрудника"),
          React.createElement("div", { className: "pa-form-row" },
            React.createElement("select", {
              className: "dkrs-select", value: assignEmp,
              onChange: function (e) { setAssignEmp(e.target.value); }
            },
              React.createElement("option", { value: "" }, "Выберите сотрудника"),
              employees.map(function (emp) {
                return React.createElement("option", { key: emp.id, value: emp.id },
                  emp.last_name + " " + emp.first_name
                );
              })
            ),
            React.createElement("select", {
              className: "dkrs-select", value: assignDept,
              onChange: function (e) { setAssignDept(e.target.value); }
            },
              React.createElement("option", { value: "" }, "Отдел"),
              depts.map(function (d) {
                return React.createElement("option", { key: d.id, value: d.id }, d.name);
              })
            ),
            React.createElement("select", {
              className: "dkrs-select", value: assignPos,
              onChange: function (e) { setAssignPos(e.target.value); }
            },
              React.createElement("option", { value: "" }, "Должность"),
              positions.map(function (p) {
                return React.createElement("option", { key: p.id, value: p.id }, p.title);
              })
            ),
            React.createElement("button", {
              className: "import-btn primary", onClick: assignEmployee,
              disabled: !assignEmp
            }, "✅ Назначить")
          )
        ),

        // Employees list
        React.createElement("div", { className: "pa-list" },
          React.createElement("h3", { style: { margin: "16px 0 12px", fontSize: 16, fontWeight: 700 } },
            "👥 Все сотрудники (" + employees.length + ")"
          ),
          employees.map(function (emp) {
            return React.createElement("div", { key: emp.id, className: "pa-card glass-card" },
              React.createElement("div", { className: "pa-card-view" },
                React.createElement("div", { className: "pa-card-info" },
                  React.createElement("div", { className: "pa-card-icon" }, "👤"),
                  React.createElement("div", null,
                    React.createElement("div", { className: "pa-card-name" },
                      emp.last_name + " " + emp.first_name + " " + (emp.middle_name || "")
                    ),
                    React.createElement("div", { className: "pa-card-meta" },
                      "🏢 " + (emp.department_id ? getDeptName(emp.department_id) : "без отдела") +
                      " · 💼 " + (emp.position_id ? getPosTitle(emp.position_id) : "без должности") +
                      " · 📧 " + (emp.email || "—")
                    )
                  )
                )
              )
            );
          })
        )
      )
    )
  );
}
