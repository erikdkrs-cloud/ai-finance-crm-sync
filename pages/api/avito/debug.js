import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var accounts = await sql`SELECT * FROM avito_accounts LIMIT 1`;
    if (!accounts || !accounts[0]) return res.json({ error: "No accounts" });

    var account = accounts[0];
    var AVITO = "https://api.avito.ru";

    var tokenRes = await fetch(AVITO + "/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials&client_id=" +
        encodeURIComponent(account.client_id) +
        "&client_secret=" + encodeURIComponent(account.client_secret),
    });
    var tokenData = await tokenRes.json();
    var token = tokenData.access_token;
    var headers = { "Authorization": "Bearer " + token };
    var userId = account.user_id || 376665673;

    // Test chats with different params
    var results = {};
    var chatEndpoints = [
      "/messenger/v2/accounts/" + userId + "/chats?limit=5",
      "/messenger/v2/accounts/" + userId + "/chats?limit=5&chat_type=u2i",
      "/messenger/v2/accounts/" + userId + "/chats?limit=5&item_types=job",
      "/messenger/v1/accounts/" + userId + "/chats?limit=5",
    ];

    for (var i = 0; i < chatEndpoints.length; i++) {
      try {
        var r = await fetch(AVITO + chatEndpoints[i], { headers: headers });
        var data = await r.json();
        var summary = { status: r.status };
        if (r.status === 200) {
          summary.chats_count = (data.chats || []).length;
          summary.meta = data.meta || null;
          if (data.chats && data.chats[0]) {
            var chat = data.chats[0];
            summary.first_chat = {
              id: chat.id,
              created: chat.created,
              context: chat.context,
              users: chat.users,
              last_message_text: chat.last_message ? (chat.last_message.text || chat.last_message.content) : null,
            };
          }
        } else {
          summary.error = data;
        }
        results[chatEndpoints[i]] = summary;
      } catch (e) {
        results[chatEndpoints[i]] = { error: e.message };
      }
    }

    // Check how many vacancies have category "Вакансии"
    var vacancyItems = await sql`SELECT COUNT(*) as cnt FROM avito_vacancies WHERE category = 'Вакансии'`;
    var allItems = await sql`SELECT DISTINCT category FROM avito_vacancies`;

    return res.json({
      ok: true,
      userId: userId,
      chat_results: results,
      db_vacancy_count: vacancyItems[0].cnt,
      db_categories: allItems.map(function(r) { return r.category; }),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
