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
    var chatId = req.query.chat_id || "u2i-w8cj2kUkPqtfvlUcdcuW3Q";
    var accounts = await sql`SELECT * FROM avito_accounts LIMIT 1`;
    if (accounts.length === 0) return res.json({ error: "no accounts" });
    var acc = accounts[0];
    var token = await getToken(acc);
    var userId = await getUserId(acc, token);

    var results = {};

    // Method 1: Phone API v1
    try {
      var r1 = await fetch("https://api.avito.ru/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/phone", { headers: { Authorization: "Bearer " + token } });
      results.phone_v1_status = r1.status;
      results.phone_v1 = await r1.text();
    } catch(e) { results.phone_v1 = "error: " + e.message; }

    // Method 2: POST phone request
    try {
      var r2 = await fetch("https://api.avito.ru/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/phone", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: "{}" });
      results.phone_post_status = r2.status;
      results.phone_post = await r2.text();
    } catch(e) { results.phone_post = "error: " + e.message; }

    // Method 3: Job applications API
    try {
      var r3 = await fetch("https://api.avito.ru/job/v1/applications/", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ per_page: 5 }) });
      results.job_api_status = r3.status;
      results.job_api = await r3.text();
    } catch(e) { results.job_api = "error: " + e.message; }

    // Method 4: Job applications with query
    try {
      var r4 = await fetch("https://api.avito.ru/job/v2/applications/?per_page=5", { headers: { Authorization: "Bearer " + token } });
      results.job_v2_status = r4.status;
      results.job_v2 = await r4.text();
    } catch(e) { results.job_v2 = "error: " + e.message; }

    // Method 5: Autoload CV API
    try {
      var r5 = await fetch("https://api.avito.ru/job/v1/resumes/received/?per_page=3", { headers: { Authorization: "Bearer " + token } });
      results.resumes_status = r5.status;
      results.resumes = await r5.text();
    } catch(e) { results.resumes = "error: " + e.message; }

    // Method 6: All messages - check for phone in any message
    try {
      var r6 = await fetch("https://api.avito.ru/messenger/v3/accounts/" + userId + "/chats/" + chatId + "/messages/?limit=100", { headers: { Authorization: "Bearer " + token } });
      var msgs = await r6.json();
      var phonesFound = [];
      if (msgs.messages) {
        for (var m = 0; m < msgs.messages.length; m++) {
          var msg = msgs.messages[m];
          var full = JSON.stringify(msg);
          var phones = full.match(/\+?[78]\d{10}/g);
          if (phones) phonesFound = phonesFound.concat(phones);
          // Also check for phone type messages
          if (msg.type === "call" || msg.type === "phone" || msg.type === "item_call") {
            phonesFound.push("type:" + msg.type + " content:" + JSON.stringify(msg.content));
          }
        }
      }
      results.phones_in_messages = phonesFound;
      results.message_types = msgs.messages ? msgs.messages.map(function(m) { return m.type; }) : [];
    } catch(e) { results.phones_in_messages = "error: " + e.message; }

    return res.json({ ok: true, chat_id: chatId, user_id: userId, results: results });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
