import { neon } from "@neondatabase/serverless";
var avito = require("../../../lib/avito");

function findPhone(text) {
  if (!text) return null;
  var cleaned = text.replace(/[^\d+]/g, "");
  var m = cleaned.match(/(?:\+7|8)\d{10}/);
  return m ? m[0] : null;
}

export default async function handler(req, res) {
  var sql = neon(process.env.DATABASE_URL);
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
    var phone = null;

    // Search phone in chat messages
    try {
      var msgs = await avito.avitoFetch(
        sql, account,
        "/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/messages/"
      );
      if (msgs.messages) {
        for (var j = 0; j < msgs.messages.length; j++) {
          var m = msgs.messages[j];
          if (m.content && m.content.text) {
            var found = findPhone(m.content.text);
            if (found) { phone = found; break; }
          }
        }
      }
    } catch (e) { /* ignore */ }

    return res.json({ ok: true, phone: phone });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
