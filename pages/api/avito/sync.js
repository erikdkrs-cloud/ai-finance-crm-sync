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

async function syncChats(acc, chatPage) {
  var token = await getToken(acc);
  var userId = await getUserId(acc, token);
  var respCount = 0;

  var offset = (chatPage || 0) * 100;
  var chatsRes = await fetch("https://api.avito.ru/messenger/v2/accounts/" + userId + "/chats?per_page=100&offset=" + offset + "&chat_type=u2i", {
    headers: { Authorization: "Bearer " + token }
  });
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
    if (chat.users && Array.isArray(chat.users)) {
      for (var u = 0; u < chat.users.length; u++) {
        var user = chat.users[u];
        if (String(user.id) !== userId) {
          authorName = user.name || "";
          authorId = String(user.id);
          break;
        }
      }
    }

    var lastMsg = "";
    var lastMsgDate = new Date().toISOString();
    if (chat.last_message) {
      if (typeof chat.last_message.text === "string") lastMsg = chat.last_message.text;
      else if (chat.last_message.content && typeof chat.last_message.content === "string") lastMsg = chat.last_message.content;
      if (chat.last_message.created) lastMsgDate = new Date(chat.last_message.created * 1000).toISOString();
    }

    var isRead = true;
    if (chat.last_message && chat.last_message.direction === "in") {
      isRead = chat.read === true ? true : false;
    }

    // Get user profile to extract phone, age, etc
    var candidateName = authorName;
    var candidateAge = "";
    var candidateCitizenship = "";
    var phone = "";

    if (authorId) {
      try {
        var profileRes = await fetch("https://api.avito.ru/core/v1/accounts/" + authorId + "/profile", {
          headers: { Authorization: "Bearer " + token }
        });
        var profileData = await profileRes.json();
        
        if (profileData) {
          if (profileData.name) candidateName = profileData.name;
          if (profileData.phone) phone = profileData.phone.replace(/[\s\-()]/g, "");
          if (profileData.age) candidateAge = String(profileData.age);
          if (profileData.citizenship) candidateCitizenship = profileData.citizenship;
        }
      } catch(e) {}
    }

    // Also parse from messages as backup
    var allMessages = "";
    try {
      var msgRes = await fetch("https://api.avito.ru/messenger/v3/accounts/" + userId + "/chats/" + chatId + "/messages/?limit=50", {
        headers: { Authorization: "Bearer " + token }
      });
      var msgData = await msgRes.json();
      if (msgData.messages && Array.isArray(msgData.messages)) {
        for (var m = 0; m < msgData.messages.length; m++) {
          var msg = msgData.messages[m];
          var txt = "";
          if (msg.content && msg.content.text) txt = msg.content.text;
          else if (msg.text) txt = msg.text;
          if (txt) allMessages += txt + " ";
        }
      }
    } catch(e) {}

    // Parse from messages if not found in profile
    if (allMessages) {
      if (!phone) {
        var phoneMatch = allMessages.match(/(\+?7[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/);
        if (phoneMatch) phone = phoneMatch[1].replace(/[\s\-()]/g, "");
      }
      if (!candidateAge) {
        var ageMatch = allMessages.match(/(\d{2})\s*(?:лет|года|год)/i);
        if (ageMatch) candidateAge = ageMatch[1];
      }
      if (!candidateCitizenship) {
        var ctzMatch = allMessages.match(/(?:гражданство|citizenship)\s*[\-—:]\s*([А-Яа-яЁё\s]+?)(?:\.|,|$)/i);
        if (ctzMatch) candidateCitizenship = ctzMatch[1].trim();
      }
    }

    await sql`INSERT INTO avito_responses
      (account_id, avito_chat_id, author_name, candidate_name, candidate_age, candidate_citizenship, phone, message, is_read, created_at, vacancy_code)
      VALUES (${acc.id}, ${chatId}, ${authorName}, ${candidateName}, ${candidateAge}, ${candidateCitizenship}, ${phone}, ${lastMsg}, ${isRead}, ${lastMsgDate}, ${itemId})
      ON CONFLICT (account_id, avito_chat_id) DO UPDATE SET
        author_name = CASE WHEN EXCLUDED.author_name != '' THEN EXCLUDED.author_name ELSE avito_responses.author_name END,
        candidate_name = CASE WHEN EXCLUDED.candidate_name != '' THEN EXCLUDED.candidate_name ELSE avito_responses.candidate_name END,
        candidate_age = CASE WHEN EXCLUDED.candidate_age != '' THEN EXCLUDED.candidate_age ELSE avito_responses.candidate_age END,
        candidate_citizenship = CASE WHEN EXCLUDED.candidate_citizenship != '' THEN EXCLUDED.candidate_citizenship ELSE avito_responses.candidate_citizenship END,
        phone = CASE WHEN EXCLUDED.phone != '' THEN EXCLUDED.phone ELSE avito_responses.phone END,
        message = EXCLUDED.message,
        is_read = CASE WHEN avito_responses.is_read = true THEN true ELSE EXCLUDED.is_read END`;

    respCount++;
  }

  return { responses: respCount };
}

export default async function handler(req, res) {
  try {
    var accounts = await sql`SELECT * FROM avito_accounts`;
    if (accounts.length === 0) return res.json({ ok: true, synced: { responses: 0 } });

    var chatPage = parseInt(req.query.chat_page) || 0;
    var totalResp = 0;
    var errors = [];

    for (var i = 0; i < accounts.length; i++) {
      try {
        var r = await syncChats(accounts[i], chatPage);
        totalResp += r.responses;
      } catch(e) {
        errors.push(accounts[i].name + ": " + e.message);
      }
    }

    return res.json({ ok: true, synced: { responses: totalResp }, errors: errors.length > 0 ? errors : undefined });
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
