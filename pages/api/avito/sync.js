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

function parseSystemText(text) {
  var result = { name: "", age: "", gender: "", citizenship: "" };
  if (!text) return result;
  var ctzMatch = text.match(/[Гг]ражданство\s*\n?\s*[—\-:]\s*([^\n]+)/);
  if (ctzMatch) result.citizenship = ctzMatch[1].trim();
  var ageMatch = text.match(/[Вв]озраст\s*\n?\s*[—\-:]\s*(\d{1,3})/);
  if (ageMatch) { var age = parseInt(ageMatch[1]); if (age >= 14 && age <= 80) result.age = String(age); }
  var fioMatch = text.match(/[ФфFf][ИиIi][ОоOo]\s*\n?\s*[—\-:]\s*([^\n]+)/);
  if (fioMatch) result.name = fioMatch[1].trim();
  var polMatch = text.match(/[Пп]ол\s*\n?\s*[—\-:]\s*([^\n]+)/);
  if (polMatch) {
    var pv = polMatch[1].trim().toLowerCase();
    if (pv.indexOf("муж") !== -1 || pv === "м") result.gender = "male";
    else if (pv.indexOf("жен") !== -1 || pv === "ж") result.gender = "female";
  }
  return result;
}

function parseTextFallback(allText) {
  var result = { phone: "", age: "", gender: "", citizenship: "", name: "" };
  if (!allText) return result;
  var lines = allText.split("\n");
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf("[") !== -1 && line.indexOf("]") !== -1) continue;
    var pm = line.match(/(?:^|[\s,.:])(\+7\d{10})(?:[\s,.]|$)/);
    if (!pm) pm = line.match(/(?:^|[\s,.:])(8\d{10})(?:[\s,.]|$)/);
    if (pm) {
      var digits = pm[1].replace(/\D/g, "");
      if (digits.length === 11 || digits.length === 12) { result.phone = pm[1].replace(/[\s\-]/g, ""); break; }
    }
  }
  var am = allText.match(/(\d{1,2})\s*(?:лет|года|год)/i);
  if (am) { var age = parseInt(am[1]); if (age >= 14 && age <= 80) result.age = String(age); }
  var gm = allText.match(/(мужчина|женщина|мужской|женский)/i);
  if (gm) { result.gender = gm[1].toLowerCase().indexOf("муж") !== -1 ? "male" : "female"; }
  var cm = allText.match(/[Гг]ражданство[\s\-:]*([А-Яа-яЁё\s]{2,30})/);
  if (cm) { var c = cm[1].trim(); if (c.length > 1 && c.length < 40) result.citizenship = c; }
  return result;
}

async function syncChats(acc, chatPage, mode) {
  var token = await getToken(acc);
  var userId = await getUserId(acc, token);
  var respCount = 0;
  var skipped = 0;
  var offset = (chatPage || 0) * 100;

  // Load existing chats from DB
  var existing = {};
  var rows = await sql`SELECT avito_chat_id, updated_at, candidate_name, candidate_age, candidate_citizenship, vacancy_title FROM avito_responses WHERE account_id = ${acc.id}`;
  for (var r = 0; r < rows.length; r++) {
    existing[rows[r].avito_chat_id] = rows[r];
  }

  // Item cache
  var itemCache = {};

  var chatsRes = await fetch("https://api.avito.ru/messenger/v2/accounts/" + userId + "/chats?per_page=100&offset=" + offset + "&chat_type=u2i", { headers: { Authorization: "Bearer " + token } });
  var chatsData = await chatsRes.json();
  var chats = chatsData.chats || [];

  // In fast mode: count consecutive skips - if 20 in a row, stop
  var consecutiveSkips = 0;

  for (var i = 0; i < chats.length; i++) {
    var chat = chats[i];
    var chatId = String(chat.id);

    // Check if chat needs update
    var needsFullUpdate = true;
    if (existing[chatId]) {
      var dbRow = existing[chatId];
      var chatUpdated = chat.updated ? new Date(chat.updated * 1000) : new Date(0);
      var dbUpdated = dbRow.updated_at ? new Date(dbRow.updated_at) : new Date(0);

      if (mode === "fast" && chatUpdated <= dbUpdated && dbRow.candidate_name && dbRow.vacancy_title) {
        // Quick update - only message and read status
        var isReadNow = true;
        if (chat.last_message && chat.last_message.direction === "in") isReadNow = chat.read === true;
        var lastMsgNow = "";
        if (chat.last_message) {
          if (chat.last_message.content && chat.last_message.content.text) lastMsgNow = chat.last_message.content.text;
          else if (chat.last_message.text) lastMsgNow = chat.last_message.text;
        }
        await sql`UPDATE avito_responses SET message = ${lastMsgNow}, is_read = CASE WHEN avito_responses.is_read = true THEN true ELSE ${isReadNow} END, updated_at = NOW() WHERE account_id = ${acc.id} AND avito_chat_id = ${chatId}`;
        skipped++;
        respCount++;
        consecutiveSkips++;
        if (consecutiveSkips >= 20) break;
        continue;
      }
    }

    consecutiveSkips = 0;

    // Item ID + vacancy from context
    var itemId = "";
    var vacancyTitle = "";
    var vacancyCity = "";
    var vacancyAddress = "";
    if (chat.context && chat.context.value) {
      var ctx = chat.context.value;
      if (typeof ctx === "number") itemId = String(ctx);
      else if (typeof ctx === "string") itemId = ctx;
      else if (ctx.id) {
        itemId = String(ctx.id);
        if (ctx.title) vacancyTitle = ctx.title;
        if (ctx.location && ctx.location.title) vacancyCity = ctx.location.title;
      }
    }

    // Author
    var authorName = "";
    var phone = "";
    if (chat.users && Array.isArray(chat.users)) {
      for (var u = 0; u < chat.users.length; u++) {
        var user = chat.users[u];
        if (String(user.id) !== userId) {
          authorName = user.name || "";
          if (user.phone) phone = user.phone.replace(/[\s\-]/g, "");
          break;
        }
      }
    }

    // Last message
    var lastMsg = "";
    var lastMsgDate = new Date().toISOString();
    if (chat.last_message) {
      var lm = chat.last_message;
      if (lm.content && lm.content.text) lastMsg = lm.content.text;
      else if (lm.text) lastMsg = lm.text;
      if (lm.created) lastMsgDate = new Date(lm.created * 1000).toISOString();
    }

    // Read
    var isRead = true;
    if (chat.last_message && chat.last_message.direction === "in") isRead = chat.read === true;

    // Vacancy - from context first, then cache, then API
    if (!vacancyTitle && itemId) {
      if (itemCache[itemId]) {
        var cached = itemCache[itemId];
        vacancyTitle = cached.title || "";
        vacancyAddress = cached.address || "";
        vacancyCity = vacancyCity || cached.city || "";
      } else {
        try {
          var itemRes = await fetch("https://api.avito.ru/core/v1/accounts/" + userId + "/items/" + itemId, { headers: { Authorization: "Bearer " + token } });
          var itemData = await itemRes.json();
          if (itemData) {
            itemCache[itemId] = itemData;
            vacancyTitle = itemData.title || "";
            vacancyAddress = itemData.address || "";
            vacancyCity = vacancyCity || itemData.city || "";
          }
        } catch(e) {}
      }
    }

    // Parse messages
    var candidateName = authorName;
    var candidateAge = "";
    var candidateCitizenship = "";
    var candidateGender = "";
    var allIncoming = "";

    try {
      var msgRes = await fetch("https://api.avito.ru/messenger/v3/accounts/" + userId + "/chats/" + chatId + "/messages/?limit=30", { headers: { Authorization: "Bearer " + token } });
      var msgData = await msgRes.json();
      if (msgData.messages && Array.isArray(msgData.messages)) {
        for (var m = 0; m < msgData.messages.length; m++) {
          var msg = msgData.messages[m];
          var msgText = "";
          if (msg.content && msg.content.text) msgText = msg.content.text;
          else if (msg.text) msgText = msg.text;
          if (msg.type === "system" && msgText) {
            var sys = parseSystemText(msgText);
            if (sys.name) candidateName = sys.name;
            if (sys.age) candidateAge = sys.age;
            if (sys.citizenship) candidateCitizenship = sys.citizenship;
            if (sys.gender) candidateGender = sys.gender;
          }
          if (msg.direction === "in" && msgText) allIncoming += msgText + "\n";
        }
      }
    } catch(e) {}

    if (allIncoming) {
      var fb = parseTextFallback(allIncoming);
      if (!phone && fb.phone) phone = fb.phone;
      if (!candidateAge && fb.age) candidateAge = fb.age;
      if (!candidateCitizenship && fb.citizenship) candidateCitizenship = fb.citizenship;
      if (!candidateGender && fb.gender) candidateGender = fb.gender;
    }

    await sql`INSERT INTO avito_responses
      (account_id, avito_chat_id, author_name, candidate_name,
       candidate_age, candidate_citizenship, candidate_gender,
       phone, message, is_read, created_at,
       vacancy_code, vacancy_title, vacancy_address, vacancy_city, updated_at)
      VALUES
      (${acc.id}, ${chatId}, ${authorName}, ${candidateName},
       ${candidateAge}, ${candidateCitizenship}, ${candidateGender},
       ${phone}, ${lastMsg}, ${isRead}, ${lastMsgDate},
       ${itemId}, ${vacancyTitle}, ${vacancyAddress}, ${vacancyCity}, NOW())
      ON CONFLICT (account_id, avito_chat_id) DO UPDATE SET
        author_name = CASE WHEN EXCLUDED.author_name != '' THEN EXCLUDED.author_name ELSE avito_responses.author_name END,
        candidate_name = CASE WHEN EXCLUDED.candidate_name != '' THEN EXCLUDED.candidate_name ELSE avito_responses.candidate_name END,
        candidate_age = CASE WHEN EXCLUDED.candidate_age != '' THEN EXCLUDED.candidate_age ELSE avito_responses.candidate_age END,
        candidate_citizenship = CASE WHEN EXCLUDED.candidate_citizenship != '' THEN EXCLUDED.candidate_citizenship ELSE avito_responses.candidate_citizenship END,
        candidate_gender = CASE WHEN EXCLUDED.candidate_gender != '' THEN EXCLUDED.candidate_gender ELSE avito_responses.candidate_gender END,
        phone = CASE WHEN EXCLUDED.phone != '' THEN EXCLUDED.phone ELSE avito_responses.phone END,
        message = EXCLUDED.message,
        is_read = CASE WHEN avito_responses.is_read = true THEN true ELSE EXCLUDED.is_read END,
        vacancy_title = CASE WHEN EXCLUDED.vacancy_title != '' THEN EXCLUDED.vacancy_title ELSE avito_responses.vacancy_title END,
        vacancy_address = CASE WHEN EXCLUDED.vacancy_address != '' THEN EXCLUDED.vacancy_address ELSE avito_responses.vacancy_address END,
        vacancy_city = CASE WHEN EXCLUDED.vacancy_city != '' THEN EXCLUDED.vacancy_city ELSE avito_responses.vacancy_city END,
        updated_at = NOW()`;

    respCount++;
  }
  return { responses: respCount, skipped: skipped, stopped: consecutiveSkips >= 20 };
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
      await sql`INSERT INTO avito_vacancies
        (account_id, avito_id, title, address, city, salary_from, url, raw_data)
        VALUES (${acc.id}, ${itemId}, ${item.title || ""}, ${item.address || ""}, ${item.city || ""}, ${item.price || null}, ${"https://www.avito.ru/items/" + itemId}, ${JSON.stringify(item)})
        ON CONFLICT (account_id, avito_id) DO UPDATE SET
          title = EXCLUDED.title, address = EXCLUDED.address,
          city = EXCLUDED.city, salary_from = EXCLUDED.salary_from,
          raw_data = EXCLUDED.raw_data`;
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
    var syncMode = req.query.sync_mode || "fast";
    var chatPage = parseInt(req.query.chat_page) || 0;
    var totalResp = 0;
    var totalVac = 0;
    var totalSkipped = 0;
    var errors = [];

    if (mode === "items") {
      for (var i = 0; i < accounts.length; i++) {
        try { var r = await syncItems(accounts[i]); totalVac += r.vacancies; } catch(e) { errors.push(accounts[i].name + ": " + e.message); }
      }
      return res.json({ ok: true, synced: { vacancies: totalVac }, errors: errors.length > 0 ? errors : undefined });
    }

    for (var i = 0; i < accounts.length; i++) {
      try {
        var r = await syncChats(accounts[i], chatPage, syncMode);
        totalResp += r.responses;
        totalSkipped += r.skipped;
      } catch(e) { errors.push(accounts[i].name + ": " + e.message); }
    }
    return res.json({ ok: true, synced: { responses: totalResp, skipped: totalSkipped }, errors: errors.length > 0 ? errors : undefined });
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
