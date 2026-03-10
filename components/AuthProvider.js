import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

var AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

var PUBLIC_PAGES = ["/login", "/register", "/"];

export default function AuthProvider({ children }) {
  var _user = useState(null), user = _user[0], setUser = _user[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var router = useRouter();

  useEffect(function () { checkAuth(); }, []);

  useEffect(function () {
    if (!loading) {
      var isPublic = PUBLIC_PAGES.indexOf(router.pathname) !== -1;
      if (!user && !isPublic) {
        router.push("/login");
      }
    }
  }, [user, loading, router.pathname]);

  async function checkAuth() {
    try {
      var res = await fetch("/api/auth/me");
      var json = await res.json();
      if (json.ok && json.user) {
        setUser(json.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    }
    setLoading(false);
  }

  async function login(loginOrEmail, password) {
    var res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginOrEmail, email: loginOrEmail, password: password }),
    });
    var json = await res.json();
    if (!json.ok) throw new Error(json.error);
    // Refresh user data
    await checkAuth();
    router.push("/dashboard");
    return json;
  }

  async function register(email, password, name) {
    var res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password, name: name }),
    });
    var json = await res.json();
    if (!json.ok) throw new Error(json.error);
    await checkAuth();
    router.push("/dashboard");
    return json;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
        fontFamily: "Inter, sans-serif", color: "#64748b", fontSize: "16px", gap: "12px",
      }}>
        <span>⏳</span>
        <span>Загрузка DKRS...</span>
      </div>
    );
  }

  var value = {
    user: user,
    login: login,
    register: register,
    logout: logout,
    isAdmin: user && user.role === "admin",
    isManager: user && (user.role === "admin" || user.role === "manager"),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
