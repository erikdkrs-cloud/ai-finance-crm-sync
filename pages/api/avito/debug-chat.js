import neon from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    
    // Get account
    var accounts = await sql`SELECT * FROM avito_accounts LIMIT 1`;
    if (!accounts.length) return res.json({ error: "no accounts" });
    
    var account = accounts[0];
    var token = account.access_token;
    var userId = account.user_id;
    
    // Get chats from Avito API
    var chatRes = await fetch("https://api.avito.ru/messenger/v2/accounts/" + userId + "/chats", {
      method: "POST",
      headers: { 
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ item_ids: [], chat_types: ["u2i"], limit: 5, offset: 0 })
    });
    var chatData = await chatRes.json();
    
    // Get count in DB
    var dbCount = await sql`SELECT COUNT(*) as cnt FROM avito_responses WHERE account_id = ${account.id}`;
    
    // Get latest 5 in DB
    var latest = await sql`SELECT avito_chat_id, candidate_name, message, created_at FROM avito_responses WHERE account_id = ${account.id} ORDER BY created_at DESC LIMIT 5`;
    
    // Check first chat from API
    var firstChat = chatData.chats ? chatData.chats[0] : null;
    var firstChatId = firstChat ? String(firstChat.id) : null;
    var existsInDb = null;
    if (firstChatId) {
      existsInDb = await sql`SELECT id, message FROM avito_responses WHERE avito_chat_id = ${firstChatId} AND account_id = ${account.id}`;
    }
    
    return res.json({
      api_chats_total: chatData.chats ? chatData.chats.length : 0,
      api_first_chat: firstChat ? {
        id: firstChat.id,
        last_message: firstChat.last_message ? firstChat.last_message.text || firstChat.last_message.content : null,
        created: firstChat.created,
        updated: firstChat.updated
      } : null,
      db_total_responses: dbCount[0].cnt,
      db_latest_5: latest,
      first_chat_exists_in_db: existsInDb,
      token_ok: chatRes.status === 200
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
