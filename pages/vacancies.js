import React, { useState, useEffect, useCallback, useRef } from "react";
import DkrsAppShell from "../components/DkrsAppShell";

function formatMoney(n) {
  if (!n) return "";
  return Number(n).toLocaleString("ru-RU") + " ₽";
}

function formatDate(d) {
  if (!d) return "";
  var date = new Date(d);
  var now = new Date();
  var diff = now - date;
  var mins = Math.floor(diff / 60000);
  var hours = Math.floor(diff / 3600000);
  var days = Math.floor(diff / 86400000);
  if (mins < 60) return mins + " мин назад";
  if (hours < 24) return hours + " ч назад";
  if (days < 7) return days + " дн назад";
  return date.toLocaleDateString("ru-RU");
}

function formatDateShort(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatTime(ts) {
  if (!ts) return "";
  var d = new Date(ts * 1000);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(ts) {
  if (!ts) return "";
  var d = new Date(ts * 1000);
  var today = new Date();
  var isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Сегодня, " + formatTime(ts);
  var yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Вчера, " + formatTime(ts);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) + " " + formatTime(ts);
}

function statusLabel(s) {
  if (s === "active") return { text: "Активна", color: "#22c55e", bg: "#f0fdf4" };
  if (s === "blocked") return { text: "Заблокирована", color: "#ef4444", bg: "#fef2f2" };
  if (s === "removed") return { text: "Удалена", color: "#6b7280", bg: "#f3f4f6" };
  if (s === "old") return { text: "Завершена", color: "#f59e0b", bg: "#fffbeb" };
  return { text: s || "—", color: "#6b7280", bg: "#f3f4f6" };
}

function extractPhone(text) {
  if (!text) return null;
  var m = text.match(/(?:\+7|8)[\s\-]?$?\d{3}$?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
  return m ? m[0] : null;
}

function parseCandidateInfo(msg) {
  if (!msg) return null;
  var info = {};
  var fioMatch = msg.match(/ФИО\s*[\n—:]+\s*(.+)/i);
  if (fioMatch) info.fio = fioMatch[1].trim();
  var ageMatch = msg.match(/Возраст\s*[\n—:]+\s*(\d+)/i);
  if (ageMatch) info.age = ageMatch[1];
  var citizenMatch = msg.match(/Гражданство\s*[\n—:]+\s*(.+)/i);
  if (citizenMatch) info.citizenship = citizenMatch[1].trim();
  var phone = extractPhone(msg);
  if (phone) info.phone = phone;
  if (Object.keys(info).length === 0) return null;
  return info;
}

export default function VacanciesPage() {
  var _vacancies = useState([]), vacancies = _vacancies[0], setVacancies = _vacancies[1];
  var _responses = useState([]), responses = _responses[0], setResponses = _responses[1];
  var _accounts = useState([]), accounts = _accounts[0], setAccounts = _accounts[1];
  var _tab = useState("vacancies"), tab = _tab[0], setTab = _tab[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _syncing = useState(false), syncing = _syncing[0], setSyncing = _syncing[1];
  var _msg = useState(null), msg = _msg[0], setMsg = _msg[1];
  var _search = useState(""), search = _search[0], setSearch = _search[1];
  var _statusFilter = useState("all"), statusFilter = _statusFilter[0], setStatusFilter = _statusFilter[1];
  var _cityFilter = useState("all"), cityFilter = _cityFilter[0], setCityFilter = _cityFilter[1];
  var _sortBy = useState("responses"), sortBy = _sortBy[0], setSortBy = _sortBy[1];
  var _selectedVacancy = useState(null), selectedVacancy = _selectedVacancy[0], setSelectedVacancy = _selectedVacancy[1];
  var _selectedChat = useState(null), selectedChat = _selectedChat[0], setSelectedChat = _selectedChat[1];
  var _chatMessages = useState([]), chatMessages = _chatMessages[0], setChatMessages = _chatMessages[1];
  var _chatLoading = useState(false), chatLoading = _chatLoading[0], setChatLoading = _chatLoading[1];
  var _chatText = useState(""), chatText = _chatText[0], setChatText = _chatText[1];
  var _sending = useState(false), sending = _sending[0], setSending = _sending[1];
  var _chatPhone = useState(null), chatPhone = _chatPhone[0], setChatPhone = _chatPhone[1];
  var _showAddAccount = useState(false), showAddAccount = _showAddAccount[0], setShowAddAccount = _showAddAccount[1];
  var _accForm = useState({ name: "", client_id: "", client_secret: "" }), accForm = _accForm[0], setAccForm = _accForm[1];
  var _responseFilter = useState("all"), responseFilter = _responseFilter[0], setResponseFilter = _responseFilter[1];
  var _page = useState(1), currentPage = _page[0], setCurrentPage = _page[1];
  var PER_PAGE = 20;
  var chatEndRef = useRef(null);

  var fetchData = useCallback(function () {
    setLoading(true);
    Promise.all([
      fetch("/api/avito/vacancies").then(function (r) { return r.json(); }),
      fetch("/api/avito/responses").then(function (r) { return r.json(); }),
      fetch("/api/avito/accounts").then(function (r) { return r.json(); }),
    ]).then(function (results) {
      setVacancies(results[0].data || []);
      setResponses(results[1].data || []);
      setAccounts(results[2].data || []);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, []);

  useEffect(function () { fetchData(); }, [fetchData]);

  useEffect(function () {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function doSync() {
    setSyncing(true); setMsg(null);
    fetch("/api/avito/sync?mode=items").then(function (r) { return r.json(); }).then(function (d1) {
      var vc = d1.synced ? d1.synced.vacancies : 0;
      setMsg({ type: "success", text: "⏳ Вакансии: " + vc + ". Загружаю отклики..." });
      var totalResp = 0;
      var pageNum = 0;
      function loadChats() {
        fetch("/api/avito/sync?mode=chats&chat_page=" + pageNum).then(function (r) { return r.json(); }).then(function (d) {
          var batch = d.synced ? d.synced.responses : 0;
          totalResp += batch;
          setMsg({ type: "success", text: "⏳ Загружено " + totalResp + " откликов..." });
          if (batch > 0 && !d.errors) { pageNum++; loadChats(); }
          else { setSyncing(false); setMsg({ type: "success", text: "✅ " + vc + " вакансий, " + totalResp + " откликов" }); fetchData(); }
        }).catch(function () { setSyncing(false); setMsg({ type: "success", text: "✅ " + vc + " вакансий, " + totalResp + " откликов" }); fetchData(); });
      }
      loadChats();
    }).catch(function (e) { setSyncing(false); setMsg({ type: "error", text: "❌ " + e.message }); });
  }

  function openChat(response) {
    setSelectedChat(response);
    setChatMessages([]);
    setChatPhone(null);
    setChatLoading(true);
    setChatText("");

    // Load messages
    fetch("/api/avito/chat?chat_id=" + response.avito_chat_id + "&account_id=" + response.account_id)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) setChatMessages(d.messages || []);
        setChatLoading(false);
      })
      .catch(function () { setChatLoading(false); });

    // Load phone
    fetch("/api/avito/phone?chat_id=" + response.avito_chat_id + "&account_id=" + response.account_id)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok && d.phone) setChatPhone(d.phone);
      })
      .catch(function () {});
  }

  function sendMessage() {
    if (!chatText.trim() || !selectedChat || sending) return;
    setSending(true);
    fetch("/api/avito/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: selectedChat.avito_chat_id,
        account_id: selectedChat.account_id,
        text: chatText.trim(),
      }),
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) {
        setChatMessages(function (prev) {
          return prev.concat([{
            id: Date.now(),
            direction: "out",
            content: chatText.trim(),
            created: Math.floor(Date.now() / 1000),
          }]);
        });
        setChatText("");
      } else {
        alert("Ошибка: " + (d.error || "Не удалось отправить"));
      }
      setSending(false);
    }).catch(function () { setSending(false); alert("Ошибка сети"); });
  }

  function refreshChat() {
    if (!selectedChat) return;
    setChatLoading(true);
    fetch("/api/avito/chat?chat_id=" + selectedChat.avito_chat_id + "&account_id=" + selectedChat.account_id)
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.ok) setChatMessages(d.messages || []); setChatLoading(false); })
      .catch(function () { setChatLoading(false); });
  }

  function addAccount(e) {
    e.preventDefault();
    fetch("/api/avito/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(accForm) })
      .then(function (r) { return r.json(); }).then(function (data) {
        if (data.ok) { setShowAddAccount(false); setAccForm({ name: "", client_id: "", client_secret: "" }); fetchData(); setMsg({ type: "success", text: "✅ Аккаунт добавлен" }); }
        else { setMsg({ type: "error", text: "❌ " + (data.error || "Ошибка") }); }
      });
  }

  function deleteAccount(id) {
    if (!confirm("Удалить аккаунт и все его данные?")) return;
    fetch("/api/avito/accounts?id=" + id, { method: "DELETE" }).then(function () { fetchData(); });
  }

  var cities = [];
  vacancies.forEach(function (v) { if (v.city && cities.indexOf(v.city) === -1) cities.push(v.city); });
  cities.sort();

  var filtered = vacancies.filter(function (v) {
    if (search && v.title.toLowerCase().indexOf(search.toLowerCase()) === -1 && (v.city || "").toLowerCase().indexOf(search.toLowerCase()) === -1) return false;
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (cityFilter !== "all" && v.city !== cityFilter) return false;
    return true;
  });

  filtered.sort(function (a, b) {
    if (sortBy === "responses") return (b.responses_count || 0) - (a.responses_count || 0);
    if (sortBy === "salary") return (b.salary_from || 0) - (a.salary_from || 0);
    if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
    if (sortBy === "date") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (sortBy === "views") return (b.views || 0) - (a.views || 0);
    return 0;
  });

  var totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  var paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  var totalActive = vacancies.filter(function (v) { return v.status === "active"; }).length;
  var totalViews = vacancies.reduce(function (s, v) { return s + (v.views || 0); }, 0);
  var totalResp = responses.length;
  var vacResponses = selectedVacancy ? responses.filter(function (r) { return r.vacancy_id === selectedVacancy.id; }) : [];
  var filteredResponses = responses.filter(function (r) { if (responseFilter === "all") return true; return r.status === responseFilter; });
  if (search && tab === "responses") {
    filteredResponses = filteredResponses.filter(function (r) {
      return (r.author_name || "").toLowerCase().indexOf(search.toLowerCase()) !== -1 || (r.message || "").toLowerCase().indexOf(search.toLowerCase()) !== -1;
    });
  }
