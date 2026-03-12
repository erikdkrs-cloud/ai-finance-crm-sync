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

      try {
        data = await avito.avitoFetch(
          sql, account,
          "/messenger/v3/accounts/" + userId + "/chats/" + chatId + "/messages"
        );
        rawMessages = data.messages || [];
      } catch (e3) {
        try {
          data = await avito.avitoFetch(
            sql, account,
            "/messenger/v2/accounts/" + userId + "/chats/" + chatId + "/messages"
          );
          rawMessages = data.messages || [];
        } catch (e2) {
          try {
            data = await avito.avitoFetch(
              sql, account,
              "/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/messages"
            );
            rawMessages = data.messages || [];
          } catch (e1) {
            return res.json({
              ok: false,
              error: "v3: " + e3.message + " | v2: " + e2.message + " | v1: " + e1.message,
              debug: { userId: userId, chatId: chatId }
            });
          }
        }
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

      return res.json({ ok: true, messages: messages, user_id: userId });
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

    try {
      var result = await avito.avitoFetch(
        sql, account2,
        "/messenger/v1/accounts/" + userId2 + "/chats/" + chatId2 + "/messages",
        {
          method: "POST",
          body: JSON.stringify({
            message: { text: text2 },
            type: "text",
          }),
        }
      );
      return res.json({ ok: true, message: result });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false });
}
