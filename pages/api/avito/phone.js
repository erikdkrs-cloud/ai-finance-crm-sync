import { neon } from "@neondatabase/serverless";
var avito = require("../../../lib/avito");

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
    // Get chat info to find the other user
    var chatData = await avito.avitoFetch(
      sql, account,
      "/messenger/v2/accounts/" + userId + "/chats/" + chatId
    );

    var otherUserId = null;
    if (chatData.users) {
      for (var i = 0; i < chatData.users.length; i++) {
        if (String(chatData.users[i].id) !== String(userId)) {
          otherUserId = chatData.users[i].id;
          break;
        }
      }
    }

    if (!otherUserId) {
      return res.json({ ok: true, phone: null, note: "No other user found" });
    }

    // Try to get phone from chat context (some API versions)
    var phone = null;

    // Method 1: Check if phone is in the messages
    try {
      var msgs = await avito.avitoFetch(
        sql, account,
        "/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/messages/"
      );
      if (msgs.messages) {
        for (var j = 0; j < msgs.messages.length; j++) {
          var m = msgs.messages[j];
          if (m.content && m.content.text) {
            var phoneMatch = m.content.text.match(/(?:\+7|8)[\s\-]?$?\d{3}$?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
            if (phoneMatch) {
              phone = phoneMatch[0];
              break;
            }
          }
        }
      }
    } catch (e) { /* ignore */ }

    // Method 2: Try getting phone via item context
    if (!phone && chatData.context && chatData.context.value && chatData.context.value.id) {
      try {
        var itemId = chatData.context.value.id;
        var phoneData = await avito.avitoFetch(
          sql, account,
          "/core/v1/accounts/" + userId + "/items/" + itemId + "/phone"
        );
        if (phoneData.phone) phone = phoneData.phone;
      } catch (e) { /* This endpoint may not exist for all cases */ }
    }

    return res.json({
      ok: true,
      phone: phone,
      other_user_id: otherUserId,
      chat_users: chatData.users || [],
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
