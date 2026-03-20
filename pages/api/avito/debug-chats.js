import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    
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
    
    var rawText = await chatRes.text();
    
    // DB count
    var dbCount = await sql`SELECT COUNT(*) as cnt FROM avito_responses WHERE account_id = ${account.id}`;
    
    return res.json({
      avito_api_status: chatRes.status,
      avito_api_response: rawText.substring(0, 500),
      token_first_20: token ? token.substring(0, 20) + "..." : "NO TOKEN",
      user_id: userId,
      db_total: dbCount[0].cnt,
      token_updated_at: account.updated_at || account.created_at
    });
  } catch(e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
