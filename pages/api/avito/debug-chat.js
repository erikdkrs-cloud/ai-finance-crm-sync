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
  if (data.id) return String(data.id);
  throw new Error("No user_id");
}

export default async function handler(req, res) {
  try {
    var chatId = req.query.chat_id;
    if (!chatId) return res.json({ error: "need chat_id" });

    var accounts = await sql`SELECT * FROM avito_accounts LIMIT 1`;
    if (accounts.length === 0) return res.json({ error: "no accounts" });
    var acc = accounts[0];
    var token = await getToken(acc);
    var userId = await getUserId(acc, token);

    // 1. Chat info
    var chatRes = await fetch("https://api.avito.ru/messenger/v2/accounts/" + userId + "/chats/" + chatId, {
      headers: { Authorization: "Bearer " + token }
    });
    var chatData = await chatRes.json();

    // 2. Phone API
    var phoneData = null;
    try {
      var phoneRes = await fetch("https://api.avito.ru/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/phone", {
        headers: { Authorization: "Bearer " + token }
      });
      phoneData = await phoneRes.json();
    } catch(e) { phoneData = { error: e.message }; }

    // 3. Messages (first 10)
    var msgsData = null;
    try {
      var msgsRes = await fetch("https://api.avito.ru/messenger/v3/accounts/" + userId + "/chats/" + chatId + "/messages/?limit=10", {
        headers: { Authorization: "Bearer " + token }
      });
      msgsData = await msgsRes.json();
    } catch(e) { msgsData = { error: e.message }; }

    // 4. DB record
    var dbRecord = await sql`SELECT * FROM avito_responses WHERE avito_chat_id = ${chatId} LIMIT 1`;

    return res.json({
      ok: true,
      chat: chatData,
      phone_api: phoneData,
      messages: msgsData,
      db_record: dbRecord[0] || null
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
