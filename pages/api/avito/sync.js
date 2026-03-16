import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

async function getToken(acc) {
  var now = Date.now();
  if (acc.access_token && acc.token_expires_at && new Date(acc.token_expires_at).getTime() > now + 60000) return acc.access_token;
  var res = await fetch("https://api.avito.ru/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials&client_id=" + acc.client_id + "&client_secret=" + acc.client_secret });
  var data = await res.json();
  if (!data.access_token) throw new Error("Token error");
  var expires = new Date(now + data.expires_in * 1000).toISOString();
  await sql`UPDATE avito_accounts SET access_token=${data.access_token}, token_expires_at=${expires} WHERE id=${acc.id}`;
  return data.access_token;
}

async function getUserId(acc, token) {
  if (acc.user_id) return acc.user_id;
  var res = await fetch("https://api.avito.ru/core/v1/accounts/self", { headers: { Authorization: "Bearer " + token } });
  var data = await res.json();
  if (data.id) { await sql`UPDATE avito_accounts SET user_id=${String(data.id)} WHERE id=${acc.id}`; return String(data.id); }
  throw new Error("No user_id");
}

async function getItemData(token, userId, itemId) {
  try { var res = await fetch("https://api.avito.ru/core/v1/accounts/" + userId + "/items/" + itemId, { headers: { Authorization: "Bearer " + token } }); var data = await res.json(); return data; } catch(e) { return null; }
}

async function syncChats(acc, chatPage) {
  var token = await getToken(acc);
  var userId = await getUserId(acc, token);
  var respCount = 0;
  var offset = (chatPage || 0) * 100;
  var chatsRes = await fetch("https://api.avito.ru/messenger/v2/accounts/" + userId + "/chats?per_page=100&offset=" + offset + "&chat_type=u2i", { headers: { Authorization: "Bearer " + token } });
  var chatsData = await chatsRes.json();
  var chats = chatsData.chats || [];

  for (var i = 0; i < chats.length; i++) {
    var chat = chats[i];
    var chatId = String(chat.id);
    var itemId = "";
    if (chat.context) {
      if (typeof chat.context.value === "number") itemId = String(chat.context.value);
      else if (typeof chat.context.value === "string") itemId = chat.context.value;
      else if (chat.context.value && chat.context.value.id) itemId = String(chat.context.value.id);
    }
    var authorName = "";
    var authorId = "";
    var phone = "";
    if (chat.users && Array.isArray(chat.users)) {
      for (var u = 0; u < chat.users.length; u++) {
        var user = chat.users[u];
        if (String(user.id) !== userId) { authorName = user.name || ""; authorId = String(user.id); if (user.phone) phone = user.phone.replace(/[\s\-()]/g, ""); break; }
      }
    }
    var lastMsg = "";
    var lastMsgDate = new Date().toISOString();
    if (chat.last_message) {
      var msgContent = chat.last_message;
      if (msgContent.text) lastMsg = msgContent.text;
      else if (msgContent.content) { if (typeof msgContent.content === "string") lastMsg = msgContent.content; else if (msgContent.content.text) lastMsg = msgContent.content.text; }
      if (msgContent.created_at) lastMsgDate = new Date(msgContent.created_at).toISOString();
      else if (msgContent.created) lastMsgDate = new Date(msgContent.created * 1000).toISOString();
    }
    var isRead = true;
    if (chat.last_message && chat.last_message.direction === "in") { isRead = chat.read === true ? true : false; }
    var vacancyTitle = "";
    var vacancyAddress = "";
    var vacancyCity = "";
    if (itemId) {
      var itemData = await getItemData(token, userId, itemId);
      if (itemData) { vacancyTitle = itemData.title || ""; vacancyAddress = itemData.address || ""; vacancyCity = itemData.city || ""; }
    }
    var candidateName = authorName;
    var candidateAge = "";
    var candidateCitizenship = "";
    var candidateGender = "";
    var allMessages = "";
    try {
      var msgRes = await fetch("https://api.avito.ru/messenger/v3/accounts/" + userId + "/chats/" + chatId + "/messages/?limit=100", { headers: { Authorization: "Bearer " + token } });
      var msgData = await msgRes.json();
      if (msgData.messages && Array.isArray(msgData.messages)) {
        for (var m = 0; m < msgData.messages.length; m++) {
          var msg = msgData.messages[m];
          if (msg.direction !== "in") continue;
          var txt = "";
          if (msg.content && msg.content.text) txt = msg.content.text;
          else if (msg.text) txt = msg.text;
          if (txt) allMessages += txt + " ";
        }
      }
    } catch(e) {}
    if (allMessages) {
      if (!phone) {
        var phoneMatch = allMessages.match(/(\+?7[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/);
        if (phoneMatch) phone = phoneMatch[1].replace(/[\s\-()]/g, "");
      }
      if (!candidateAge) {
        var ageMatch = allMessages.match(/(\d{1,3})\s*(?:лет|года|год|age)/i);
        if (ageMatch) candidateAge = ageMatch[1];
      }
      if (!candidateCitizenship) {
        var ctzMatch = allMessages.match(/(?:гражданство|citizenship)\s*[\-—:]*\s*([А-Яа-яЁё\s]+?)(?:\s+(?:возраст|age|пол|gender)|$)/i);
        if (ctzMatch) { var ctz = ctzMatch[1].trim(); if (ctz.length > 1 && ctz.length < 50) candidateCitizenship = ctz; }
      }
    }
    await sql`INSERT INTO avito_responses (account_id, avito_chat_id, author_name, candidate_name, candidate_age, candidate_citizenship, candidate_gender, phone, message, is_read, created_at, vacancy_code, vacancy_title, vacancy_address, vacancy_city) VALUES (${acc.id}, ${chatId}, ${authorName}, ${candidateName}, ${candidateAge}, ${candidateCitizenship}, ${candidateGender}, ${phone}, ${lastMsg}, ${isRead}, ${lastMsgDate}, ${itemId}, ${vacancyTitle}, ${vacancyAddress}, ${vacancyCity}) ON CONFLICT (account_id, avito_chat_id) DO UPDATE SET author_name = CASE WHEN EXCLUDED.author_name != '' THEN EXCLUDED.author_name ELSE avito_responses.author_name END, candidate_name = CASE WHEN EXCLUDED.candidate_name != '' THEN EXCLUDED.candidate_name ELSE avito_responses.candidate_name END, candidate_age = CASE WHEN EXCLUDED.candidate_age != '' THEN EXCLUDED.candidate_age ELSE avito_responses.candidate_age END, candidate_citizenship = CASE WHEN EXCLUDED.candidate_citizenship != '' THEN EXCLUDED.candidate_citizenship ELSE avito_responses.candidate_citizenship END, candidate_gender = CASE WHEN EXCLUDED.candidate_gender != '' THEN EXCLUDED.candidate_gender ELSE avito_responses.candidate_gender END, phone = CASE WHEN EXCLUDED.phone != '' THEN EXCLUDED.phone ELSE avito_responses.phone END, message = EXCLUDED.message, is_read = CASE WHEN avito_responses.is_read = true THEN true ELSE EXCLUDED.is_read END, vacancy_title = CASE WHEN EXCLUDED.vacancy_title != '' THEN EXCLUDED.vacancy_title ELSE avito_responses.vacancy_title END, vacancy_address = CASE WHEN EXCLUDED.vacancy_address != '' THEN EXCLUDED.vacancy_address ELSE avito_responses.vacancy_address END, vacancy_city = CASE WHEN EXCLUDED.vacancy_city != '' THEN EXCLUDED.vacancy_city ELSE avito_responses.vacancy_city END`;
    respCount++;
  }
  return { responses: respCount };
}

async function syncItems(acc) {
  var token = await getToken(acc);
  var userId = await getUserId(acc, token);
  var vacCount = 0;
  var offset = 0;
  var hasMore = true;
  while (hasMore) {
    var itemsRes = await fetch("https://api.avito.ru/core/v1/accounts/" + userId + "/items?offset=" + offset + "&limit=100", { headers: { Authorization: "Bearer " + token } });
    var itemsData = await itemsRes.json();
    var items = itemsData.items || [];
    if (items.length === 0) hasMore = false;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var itemId = String(item.id);
      var title = item.title || "";
      var address = item.address || "";
      var city = item.city || "";
      var salary_from = item.price || null;
      var url = "https://www.avito.ru/items/" + itemId;
      await sql`INSERT INTO avito_vacancies (account_id, avito_id, title, address, city, salary_from, url, raw_data) VALUES (${acc.id}, ${itemId}, ${title}, ${address}, ${city}, ${salary_from}, ${url}, ${JSON.stringify(item)}) ON CONFLICT (account_id, avito_id) DO UPDATE SET title = EXCLUDED.title, address = EXCLUDED.address, city = EXCLUDED.city, salary_from = EXCLUDED.salary_from, raw_data = EXCLUDED.raw_data`;
      vacCount++;
    }
    offset += 100;
  }
  return { vacancies: vacCount };
}

export default async function handler(req, res) {
  try {
    var accounts = await sql`SELECT * FROM avito_accounts`;
    if (accounts.length === 0) return res.json({ ok: true, synced: { responses: 0 } });
    var mode = req.query.mode || "chats";
    var chatPage = parseInt(req.query.chat_page) || 0;
    var totalResp = 0;
    var totalVac = 0;
    var errors = [];
    if (mode === "items") {
      for (var i = 0; i < accounts.length; i++) {
        try { var r = await syncItems(accounts[i]); totalVac += r.vacancies; } catch(e) { errors.push(accounts[i].name + ": " + e.message); }
      }
      return res.json({ ok: true, synced: { vacancies: totalVac }, errors: errors.length > 0 ? errors : undefined });
    }
    for (var i = 0; i < accounts.length; i++) {
      try { var r = await syncChats(accounts[i], chatPage); totalResp += r.responses; } catch(e) { errors.push(accounts[i].name + ": " + e.message); }
    }
    return res.json({ ok: true, synced: { responses: totalResp }, errors: errors.length > 0 ? errors : undefined });
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
