import { neon } from "@neondatabase/serverless";
var avito = require("../../../lib/avito");

export default async function handler(req, res) {
  var sql = neon(process.env.DATABASE_URL);

  if (req.method === "GET") {
    var chatId = req.query.chat_id;
    var accountId = Number(req.query.account_id);

    if (!chatId || !accountId) {
      return res.status(400).json({ ok: false, error: "chat_id and account_id required" });
    }

    var accounts = await sql`SELECT * FROM avito_accounts WHERE id = ${accountId}`;
    if (!accounts || accounts.length === 0) {
      return res.status(404).json({ ok: false, error: "Account not found" });
    }

    var account = accounts[0];
    var userId = await avito.getUserId(sql, account);

    try {
      var data = null;
      var rawMessages = [];
      var usedApi = "";

      // Try all possible endpoints
      var endpoints = [
        "/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/messages/",
        "/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/messages",
        "/messenger/v2/accounts/" + userId + "/chats/" + chatId + "/messages/",
        "/messenger/v2/accounts/" + userId + "/chats/" + chatId + "/messages",
        "/messenger/v3/accounts/" + userId + "/chats/" + chatId + "/messages/",
        "/messenger/v3/accounts/" + userId + "/chats/" + chatId + "/messages",
      ];

      var lastError = "";
      for (var i = 0; i < endpoints.length; i++) {
        try {
          data = await avito.avitoFetch(sql, account, endpoints[i]);
          rawMessages = data.messages || [];
          usedApi = endpoints[i];
          break;
        } catch (e) {
          lastError = endpoints[i] + " -> " + e.message;
          data = null;
        }
      }

      if (!data) {
        return res.json({ ok: false, error: lastError, debug: { userId: userId, chatId: chatId } });
      }

      var messages = rawMessages.map(function (m) {
        var text = "";
        if (m.content) {
          if (typeof m.content === "string") text = m.content;
          else if (m.content.text) text = m.content.text;
        }
        if (!text && m.text) text = m.text;

        return {
          id: m.id,
          author_id: m.author_id,
          content: text,
          created: m.created,
          is_read: m.is_read,
          direction: String(m.author_id) === String(userId) ? "out" : "in",
        };
      });

      messages.sort(function (a, b) { return a.created - b.created; });

      return res.json({ ok: true, messages: messages, user_id: userId, api: usedApi });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === "POST") {
    var body = req.body || {};
    var chatId2 = body.chat_id;
    var accountId2 = Number(body.account_id);
    var text2 = String(body.text || "").trim();

    if (!chatId2 || !accountId2 || !text2) {
      return res.status(400).json({ ok: false, error: "chat_id, account_id, text required" });
    }

    var accounts2 = await sql`SELECT * FROM avito_accounts WHERE id = ${accountId2}`;
    if (!accounts2 || accounts2.length === 0) {
      return res.status(404).json({ ok: false, error: "Account not found" });
    }

    var account2 = accounts2[0];
    var userId2 = await avito.getUserId(sql, account2);

    // Try multiple send endpoints
    var sendEndpoints = [
      "/messenger/v1/accounts/" + userId2 + "/chats/" + chatId2 + "/messages",
      "/messenger/v1/accounts/" + userId2 + "/chats/" + chatId2 + "/messages/",
      "/messenger/v2/accounts/" + userId2 + "/chats/" + chatId2 + "/messages",
      "/messenger/v2/accounts/" + userId2 + "/chats/" + chatId2 + "/messages/",
    ];

    // Try different body formats
    var bodyFormats = [
      { message: { text: text2 }, type: "text" },
      { text: text2, type: "text" },
      { message: { text: text2 } },
    ];

    var sent = false;
    var lastSendError = "";

    for (var si = 0; si < sendEndpoints.length && !sent; si++) {
      for (var bi = 0; bi < bodyFormats.length && !sent; bi++) {
        try {
          var result = await avito.avitoFetch(
            sql, account2, sendEndpoints[si],
            { method: "POST", body: JSON.stringify(bodyFormats[bi]) }
          );
          return res.json({ ok: true, message: result, api: sendEndpoints[si] });
        } catch (e) {
          lastSendError = sendEndpoints[si] + " body" + bi + " -> " + e.message;
        }
      }
    }

    return res.json({ ok: false, error: lastSendError });
  }

  return res.status(405).json({ ok: false });
}
