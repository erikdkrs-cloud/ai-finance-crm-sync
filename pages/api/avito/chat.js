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
      // Try v2 first, then v1
      var data = null;
      var rawMessages = [];

      try {
        data = await avito.avitoFetch(
          sql, account,
          "/messenger/v2/accounts/" + userId + "/chats/" + chatId + "/messages/"
        );
        rawMessages = data.messages || [];
      } catch (e1) {
        try {
          data = await avito.avitoFetch(
            sql, account,
            "/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/messages/"
          );
          rawMessages = data.messages || [];
        } catch (e2) {
          return res.json({
            ok: false,
            error: "v2: " + e1.message + " | v1: " + e2.message,
            debug: { userId: userId, chatId: chatId, accountId: accountId }
          });
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
          type: m.type || "text",
        };
      });

      messages.sort(function (a, b) { return a.created - b.created; });

      return res.json({
        ok: true,
        messages: messages,
        user_id: userId,
        raw_count: rawMessages.length,
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message, debug: { userId: userId, chatId: chatId } });
    }
  }

  if (req.method === "POST") {
    var body = req.body || {};
    var chatId = body.chat_id;
    var accountId = Number(body.account_id);
    var text = String(body.text || "").trim();

    if (!chatId || !accountId || !text) {
      return res.status(400).json({ ok: false, error: "chat_id, account_id, text required" });
    }

    var accounts = await sql`SELECT * FROM avito_accounts WHERE id = ${accountId}`;
    if (!accounts || accounts.length === 0) {
      return res.status(404).json({ ok: false, error: "Account not found" });
    }

    var account = accounts[0];
    var userId = await avito.getUserId(sql, account);

    try {
      var result = await avito.avitoFetch(
        sql, account,
        "/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/messages/",
        {
          method: "POST",
          body: JSON.stringify({
            message: { text: text },
            type: "text",
          }),
        }
      );
      return res.json({ ok: true, message: result });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
