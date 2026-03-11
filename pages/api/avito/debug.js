import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var accounts = await sql`SELECT * FROM avito_accounts LIMIT 1`;

    if (!accounts || !accounts[0]) {
      return res.json({ ok: false, error: "No accounts" });
    }

    var account = accounts[0];
    var AVITO = "https://api.avito.ru";
    var userId = 376665673;

    // Get token with scopes
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

    var results = {};

    // Try ALL possible item endpoints
    var endpoints = [
      "/core/v1/accounts/" + userId + "/items",
      "/core/v1/accounts/" + userId + "/items/",
      "/core/v1/items",
      "/core/v1/items/",
      "/items/v1/accounts/" + userId + "/items",
      "/autoload/v2/accounts/" + userId + "/items",
      "/core/v1/accounts/" + userId + "/items?status=active",
      "/job/v1/accounts/" + userId + "/vacancies",
      "/job/v2/accounts/" + userId + "/vacancies",
      "/core/v1/accounts/" + userId + "/items?category_id=110",
      "/messenger/v1/accounts/" + userId + "/chats",
      "/messenger/v2/accounts/" + userId + "/chats",
      "/messenger/v3/accounts/" + userId + "/chats",
      "/core/v1/accounts/" + userId + "/stats/items",
    ];

    for (var i = 0; i < endpoints.length; i++) {
      try {
        var r = await fetch(AVITO + endpoints[i], { headers: headers });
        var text = await r.text();
        var data;
        try { data = JSON.parse(text); } catch (e) { data = text; }
        // Truncate large responses
        var summary = { status: r.status };
        if (r.status === 200) {
          if (data.resources) summary.resources_count = data.resources.length;
          if (data.chats) summary.chats_count = data.chats.length;
          if (data.items) summary.items_count = data.items.length;
          if (data.vacancies) summary.vacancies_count = data.vacancies.length;
          summary.keys = Object.keys(data);
          // Show first item if exists
          if (data.resources && data.resources[0]) summary.first_item = data.resources[0];
          if (data.chats && data.chats[0]) summary.first_chat_keys = Object.keys(data.chats[0]);
          if (data.items && data.items[0]) summary.first_item = data.items[0];
          if (data.vacancies && data.vacancies[0]) summary.first_vacancy = data.vacancies[0];
        } else {
          summary.body = typeof data === "string" ? data.slice(0, 200) : data;
        }
        results[endpoints[i]] = summary;
      } catch (e) {
        results[endpoints[i]] = { error: e.message };
      }
    }

    return res.json({
      ok: true,
      token_scope: tokenData.scope || tokenData.scopes || "not_in_response",
      token_type: tokenData.token_type,
      results: results,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
