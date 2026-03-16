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
    
    // Extract item ID safely
    var itemId = "";
    if (chat.context) {
      if (typeof chat.context.value === "number") itemId = String(chat.context.value);
      else if (typeof chat.context.value === "string") itemId = chat.context.value;
      else if (chat.context.value && chat.context.value.id) itemId = String(chat.context.value.id);
    }

    // Get author info
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

    // Get last message
    var lastMsg = "";
    var lastMsgDate = new Date().toISOString();
    if (chat.last_message) {
      if (typeof chat.last_message.text === "string") lastMsg = chat.last_message.text;
      else if (chat.last_message.content && typeof chat.last_message.content === "string") lastMsg = chat.last_message.content;
      if (chat.last_message.created) lastMsgDate = new Date(chat.last_message.created * 1000).toISOString();
    }

    // Check if unread
    var isRead = true;
    if (chat.last_message && chat.last_message.direction === "in") {
      isRead = chat.read === true ? true : false;
    }

    // Insert with minimal data
    await sql`INSERT INTO avito_responses
      (account_id, avito_chat_id, author_name, message, is_read, created_at, vacancy_code)
      VALUES (${acc.id}, ${chatId}, ${authorName}, ${lastMsg}, ${isRead}, ${lastMsgDate}, ${itemId})
      ON CONFLICT (account_id, avito_chat_id) DO UPDATE SET
        author_name = CASE WHEN EXCLUDED.author_name != '' THEN EXCLUDED.author_name ELSE avito_responses.author_name END,
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
