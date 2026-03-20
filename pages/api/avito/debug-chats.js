import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var accounts = await sql`SELECT * FROM avito_accounts LIMIT 1`;
    var account = accounts[0];
    var token = account.access_token;
    var userId = account.user_id;
    
    // Test vacancies API (GET)
    var vacRes = await fetch("https://api.avito.ru/job/v1/vacancies?per_page=1", {
      headers: { Authorization: "Bearer " + token }
    });
    var vacText = await vacRes.text();
    
    // Test chats API (POST) 
    var chatRes = await fetch("https://api.avito.ru/messenger/v2/accounts/" + userId + "/chats", {
      method: "POST",
      headers: { 
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ item_ids: [], chat_types: ["u2i"], limit: 2, offset: 0 })
    });
    var chatText = await chatRes.text();

    // Test chats API v1 (GET)
    var chatRes2 = await fetch("https://api.avito.ru/messenger/v1/accounts/" + userId + "/chats?chat_type=u2i&limit=2", {
      headers: { Authorization: "Bearer " + token }
    });
    var chatText2 = await chatRes2.text();
    
    return res.json({
      vacancies_api: { status: vacRes.status, body: vacText.substring(0, 200) },
      chats_v2_post: { status: chatRes.status, body: chatText.substring(0, 200) },
      chats_v1_get: { status: chatRes2.status, body: chatText2.substring(0, 200) },
      user_id: userId,
      db_total: (await sql`SELECT COUNT(*) as cnt FROM avito_responses`)[0].cnt
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
