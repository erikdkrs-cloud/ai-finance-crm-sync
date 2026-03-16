import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

async function getToken(acc) {
  var now = Date.now();
  if (acc.access_token && acc.token_expires_at && new Date(acc.token_expires_at).getTime() > now + 60000) return acc.access_token;
  var res = await fetch("https://api.avito.ru/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&client_id=" + acc.client_id + "&client_secret=" + acc.client_secret,
  });
  var data = await res.json();
  if (!data.access_token) throw new Error("Token error: " + JSON.stringify(data));
  var expires = new Date(now + data.expires_in * 1000).toISOString();
  await sql`UPDATE avito_accounts SET access_token=${data.access_token}, token_expires_at=${expires} WHERE id=${acc.id}`;
  return data.access_token;
}

async function getUserId(acc, token) {
  if (acc.user_id) return acc.user_id;
  var res = await fetch("https://api.avito.ru/core/v1/accounts/self", { headers: { Authorization: "Bearer " + token } });
  var data = await res.json();
  if (data.id) { await sql`UPDATE avito_accounts SET user_id=${String(data.id)} WHERE id=${acc.id}`; return String(data.id); }
  throw new Error("Cannot get user_id");
}

async function syncItems(acc) {
  var token = await getToken(acc);
  var userId = await getUserId(acc, token);
  var vacCount = 0;

  for (var st = 0; st < 2; st++) {
    var status = st === 0 ? "active" : "old";
    var page = 1;
    var hasMore = true;
    while (hasMore) {
      var res = await fetch("https://api.avito.ru/core/v1/accounts/" + userId + "/items?per_page=25&page=" + page + "&status=" + status, {
        headers: { Authorization: "Bearer " + token }
      });
      var data = await res.json();
      var items = data.resources || [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var addr = item.address || "";
        var itemUrl = item.url || ("https://www.avito.ru/" + item.id);
        await sql`INSERT INTO avito_vacancies (account_id, avito_id, title, city, salary_from, salary_to, status, address, url)
          VALUES (${acc.id}, ${String(item.id)}, ${item.title||""}, ${item.city||""}, ${item.salary_from||null}, ${item.salary_to||null}, ${status}, ${addr}, ${itemUrl})
          ON CONFLICT (account_id, avito_id) DO UPDATE SET
            title=EXCLUDED.title, city=EXCLUDED.city, salary_from=EXCLUDED.salary_from, salary_to=EXCLUDED.salary_to,
            status=EXCLUDED.status,
            address=CASE WHEN EXCLUDED.address!='' THEN EXCLUDED.address ELSE avito_vacancies.address END,
            url=CASE WHEN EXCLUDED.url!='' THEN EXCLUDED.url ELSE avito_vacancies.url END`;
        vacCount++;
      }
      hasMore = items.length === 25;
      page++;
    }
  }
  return { vacancies: vacCount };
}

async function syncChats(acc, chatPage) {
  var token = await getToken(acc);
  var userId = await getUserId(acc, token);
  var respCount = 0;
  var allVac = await sql`SELECT id, avito_id, title, address, city FROM avito_vacancies WHERE account_id=${acc.id}`;

  var offset = (chatPage || 0) * 50;
  var chatsRes = await fetch("https://api.avito.ru/messenger/v2/accounts/" + userId + "/chats?per_page=50&offset=" + offset + "&chat_type=u2i", {
    headers: { Authorization: "Bearer " + token }
  });
  var chatsData = await chatsRes.json();
  var chats = chatsData.chats || [];

  for (var i = 0; i < chats.length; i++) {
    var chat = chats[i];
    var chatId = chat.id;
    var itemId = "";
    if (chat.context && chat.context.value && chat.context.type === "item") itemId = String(chat.context.value);
    var vacancy = itemId ? allVac.find(function(v){return v.avito_id===itemId;}) : null;

    var authorName = "";
    var authorId = "";
    if (chat.users) {
      for (var u = 0; u < chat.users.length; u++) {
        if (String(chat.users[u].id) !== userId) { authorName = chat.users[u].name||""; authorId = String(chat.users[u].id); break; }
      }
    }

    var lastMsg = "";
    var lastMsgDate = null;
    if (chat.last_message) {
      lastMsg = chat.last_message.text || chat.last_message.content || "";
      if (typeof lastMsg === "object") lastMsg = lastMsg.text || JSON.stringify(lastMsg);
      if (chat.last_message.created) lastMsgDate = new Date(chat.last_message.created * 1000).toISOString();
    }

    // Parse candidate info from messages
    var candidateName = "";
    var candidateAge = "";
    var candidateCitizenship = "";
    var phone = "";

    try {
      var msgsRes = await fetch("https://api.avito.ru/messenger/v3/accounts/" + userId + "/chats/" + chatId + "/messages/?limit=20", {
        headers: { Authorization: "Bearer " + token }
      });
      var msgsData = await msgsRes.json();
      var messages = msgsData.messages || [];
      for (var mi = 0; mi < messages.length; mi++) {
        var mx = messages[mi];
        var txt = "";
        if (mx.content && mx.content.text) txt = mx.content.text;
        else if (mx.text) txt = mx.text;
        if (txt) {
          var pm = txt.match(/(\+?7[\s\-]?$?\d{3}$?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/);
          if (pm && !phone) phone = pm[1].replace(/[\s\-\(\)]/g, "");
          // Parse system messages like: Гражданство — Таджикистан Возраст — 29 лет ФИО — Хамдамов
          var ctzMatch = txt.match(/[Гг]ражданство\s*[\-—]\s*([^\s,—]+)/);
          if (ctzMatch && !candidateCitizenship) candidateCitizenship = ctzMatch[1];
          var ageMatch = txt.match(/[Вв]озраст\s*[\-—]\s*(\d+)/);
          if (ageMatch && !candidateAge) candidateAge = ageMatch[1];
          var fioMatch = txt.match(/ФИО\s*[\-—]\s*([^,\n]+)/);
          if (fioMatch && !candidateName) candidateName = fioMatch[1].trim();
        }
      }
    } catch(e){}

    if (!candidateName) candidateName = authorName;

    var vacId = vacancy ? vacancy.id : null;
    var vacTitle = vacancy ? vacancy.title : "";
    var vacAddress = vacancy ? (vacancy.address || vacancy.city || "") : "";
    var vacCode = itemId;

    var isRead = true;
    if (chat.last_message && chat.last_message.direction === "in") {
      if (typeof chat.read !== "undefined") isRead = !!chat.read;
      else isRead = false;
    }

    await sql`INSERT INTO avito_responses
      (account_id, avito_chat_id, vacancy_id, vacancy_title, vacancy_code, vacancy_address, vacancy_city,
       author_name, candidate_name, candidate_age, candidate_citizenship, phone,
       message, is_read, created_at)
      VALUES (${acc.id}, ${chatId}, ${vacId}, ${vacTitle}, ${vacCode}, ${vacAddress}, ${vacancy?vacancy.city||"":""},
        ${authorName}, ${candidateName}, ${candidateAge}, ${candidateCitizenship}, ${phone},
        ${lastMsg}, ${isRead}, ${lastMsgDate || new Date().toISOString()})
      ON CONFLICT (account_id, avito_chat_id) DO UPDATE SET
        vacancy_id = COALESCE(EXCLUDED.vacancy_id, avito_responses.vacancy_id),
        vacancy_title = CASE WHEN EXCLUDED.vacancy_title!='' THEN EXCLUDED.vacancy_title ELSE avito_responses.vacancy_title END,
        vacancy_code = CASE WHEN EXCLUDED.vacancy_code!='' THEN EXCLUDED.vacancy_code ELSE avito_responses.vacancy_code END,
        vacancy_address = CASE WHEN EXCLUDED.vacancy_address!='' THEN EXCLUDED.vacancy_address ELSE avito_responses.vacancy_address END,
        vacancy_city = CASE WHEN EXCLUDED.vacancy_city!='' THEN EXCLUDED.vacancy_city ELSE avito_responses.vacancy_city END,
        author_name = CASE WHEN EXCLUDED.author_name!='' THEN EXCLUDED.author_name ELSE avito_responses.author_name END,
        candidate_name = CASE WHEN EXCLUDED.candidate_name!='' THEN EXCLUDED.candidate_name ELSE avito_responses.candidate_name END,
        candidate_age = CASE WHEN EXCLUDED.candidate_age!='' THEN EXCLUDED.candidate_age ELSE avito_responses.candidate_age END,
        candidate_citizenship = CASE WHEN EXCLUDED.candidate_citizenship!='' THEN EXCLUDED.candidate_citizenship ELSE avito_responses.candidate_citizenship END,
        phone = CASE WHEN EXCLUDED.phone!='' THEN EXCLUDED.phone ELSE avito_responses.phone END,
        message = EXCLUDED.message,
        is_read = CASE WHEN avito_responses.is_read = true THEN true ELSE EXCLUDED.is_read END`;
    respCount++;
  }
  return { responses: respCount };
}

export default async function handler(req, res) {
  try {
    var accounts = await sql`SELECT * FROM avito_accounts`;
    if (accounts.length === 0) return res.json({ ok: true, synced: { vacancies: 0, responses: 0 }, message: "No accounts" });
    var mode = req.query.mode || "all";
    var chatPage = parseInt(req.query.chat_page) || 0;
    var totalVac = 0, totalResp = 0, errors = [];
    for (var i = 0; i < accounts.length; i++) {
      try {
        if (mode === "items" || mode === "all") { var r1 = await syncItems(accounts[i]); totalVac += r1.vacancies; }
        if (mode === "chats" || mode === "all") { var r2 = await syncChats(accounts[i], chatPage); totalResp += r2.responses; }
      } catch(e) { errors.push(accounts[i].name + ": " + e.message); }
    }
    try { await sql`UPDATE avito_vacancies v SET responses_count = (SELECT COUNT(*) FROM avito_responses r WHERE r.vacancy_id = v.id)`; } catch(e){}
    return res.json({ ok: true, synced: { vacancies: totalVac, responses: totalResp }, errors: errors.length > 0 ? errors : undefined });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}
