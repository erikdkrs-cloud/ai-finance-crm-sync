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

  useEffect(function () {
    if (user) loadData();
  }, [user]);

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
    var name = (e.first_name + " " + e.last_name + " " + e.middle_name + " " + e.name + " " + e.email).toLowerCase();
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

  return (
    <DkrsAppShell>
      <div style={{ padding: "0 0 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>👥 Команда</h1>
          <div style={{ opacity: 0.5, fontSize: 14 }}>{filtered.length} сотрудников</div>
        </div>

        {/* Фильтры */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <input
            value={search}
            onChange={function (e) { setSearch(e.target.value); }}
            placeholder="🔍 Поиск по имени..."
            style={{
              flex: 1, padding: "10px 14px",
              background: "var(--input-bg, rgba(255,255,255,0.08))",
              border: "1px solid var(--card-border, rgba(255,255,255,0.15))",
              borderRadius: 10, color: "inherit", fontSize: 14, outline: "none"
            }}
          />
          <select
            value={filterDept}
            onChange={function (e) { setFilterDept(e.target.value); }}
            style={{
              padding: "10px 14px",
              background: "var(--input-bg, rgba(255,255,255,0.08))",
              border: "1px solid var(--card-border, rgba(255,255,255,0.15))",
              borderRadius: 10, color: "inherit", fontSize: 14, outline: "none"
            }}
          >
            <option value="">Все отделы</option>
            {departments.map(function (d) {
              return <option key={d.id} value={d.id}>{d.name}</option>;
            })}
          </select>
        </div>

        {/* Карточки сотрудников */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, opacity: 0.4 }}>Загрузка...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {filtered.map(function (emp) {
              return (
                <div key={emp.id} onClick={function () { setSelectedEmployee(emp); }} style={{
                  background: "var(--card-bg, rgba(255
