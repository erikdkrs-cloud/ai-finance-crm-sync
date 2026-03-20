import { neon } from "@neondatabase/serverless";
 
var AVITO_API = "https://api.avito.ru";

async function getAccessToken(sql, account) {
  if (account.access_token && account.token_expires_at) {
    var expires = new Date(account.token_expires_at);
    if (expires > new Date(Date.now() + 5 * 60 * 1000)) {
      return account.access_token;
    }
  }

  var res = await fetch(AVITO_API + "/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&client_id=" +
      encodeURIComponent(account.client_id) +
      "&client_secret=" + encodeURIComponent(account.client_secret),
  });

  if (!res.ok) throw new Error("Auth error " + res.status);

  var data = await res.json();
  var token = data.access_token;
  var expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

  await sql`
    UPDATE avito_accounts
    SET access_token = ${token}, token_expires_at = ${expiresAt.toISOString()}
    WHERE id = ${account.id}
  `;

  return token;
}

async function avitoFetch(sql, account, path, options) {
  var token = await getAccessToken(sql, account);
  var method = (options && options.method) || "GET";
  var headers = { "Authorization": "Bearer " + token };
  if (method !== "GET") headers["Content-Type"] = "application/json";

  var fetchOpts = { method: method, headers: headers };
  if (options && options.body) {
    fetchOpts.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  var res = await fetch(AVITO_API + path, fetchOpts);
  if (!res.ok) throw new Error("Avito API " + res.status + ": " + (await res.text()));
  return res.json();
}

async function getUserId(sql, account) {
  if (account.user_id) return account.user_id;
  var data = await avitoFetch(sql, account, "/core/v1/accounts/self");
  var userId = data.id;
  await sql`UPDATE avito_accounts SET user_id = ${userId} WHERE id = ${account.id}`;
  return userId;
}

async function syncVacancies(sql, account) {
  var userId = await getUserId(sql, account);
  var vacancies = [];
  var page = 1;
  var perPage = 50;

  while (true) {
    var data = await avitoFetch(sql, account, "/core/v1/items?per_page=" + perPage + "&page=" + page + "&status=active");
    var resources = data.resources || [];
    vacancies = vacancies.concat(resources);
    if (resources.length < perPage) break;
    page++;
    if (page > 20) break;
  }

  var count = 0;
  for (var i = 0; i < vacancies.length; i++) {
    var v = vacancies[i];
    var avitoId = String(v.id);
    var title = v.title || "";
    var address = v.address || "";
    var city = v.city || "";
    var category = v.category ? v.category.name : "";
    var price = v.price ? v.price.value : null;
    var url = v.url || "";
    var status = v.status || "";

    await sql`
      INSERT INTO avito_vacancies (avito_id, account_id, title, address, city, category, price, url, status, raw_data, updated_at)
      VALUES (${avitoId}, ${account.id}, ${title}, ${address}, ${city}, ${category}, ${price}, ${url}, ${status}, ${JSON.stringify(v)}, NOW())
      ON CONFLICT (avito_id) DO UPDATE SET
        title = EXCLUDED.title,
        address = CASE WHEN EXCLUDED.address != '' THEN EXCLUDED.address ELSE avito_vacancies.address END,
        city = CASE WHEN EXCLUDED.city != '' THEN EXCLUDED.city ELSE avito_vacancies.city END,
        category = EXCLUDED.category,
        price = EXCLUDED.price,
        url = EXCLUDED.url,
        status = EXCLUDED.status,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW()
    `;
    count++;
  }
  return count;
}

async function syncChats(sql, account) {
  var userId = await getUserId(sql, account);
  var count = 0;

  for (var page = 0; page < 3; page++) {
    var chatsData;
    try {
      chatsData = await avitoFetch(sql, account, "/messenger/v2/accounts/" + userId + "/chats", {
        method: "POST",
        body: { item_ids: [], chat_types: ["u2i"], limit: 50, offset: page * 50 }
      });
    } catch (e) {
      break;
    }

    var chats = (chatsData && chatsData.chats) || [];
    if (chats.length === 0) break;

    for (var i = 0; i < chats.length; i++) {
      var chat = chats[i];
      var chatId = chat.id;
      var context = chat.context || {};
      var lastMsg = (chat.last_message && chat.last_message.content && chat.last_message.content.text) || "";
      var authorName = "";
      var users = chat.users || [];
      for (var u = 0; u < users.length; u++) {
        if (String(users[u].id) !== String(userId)) {
          authorName = users[u].name || "";
          break;
        }
      }

      var vacancyCode = context.value ? String(context.value.id || "") : "";
      var vacancyTitle = context.value ? (context.value.title || "") : "";

      var existing = await sql`SELECT id FROM avito_responses WHERE avito_chat_id = ${chatId} AND account_id = ${account.id} LIMIT 1`;
      if (existing.length > 0) continue;

      await sql`
        INSERT INTO avito_responses (avito_chat_id, account_id, vacancy_code, vacancy_title, candidate_name, message, created_at, raw_data, status, is_read)
        VALUES (${chatId}, ${account.id}, ${vacancyCode}, ${vacancyTitle}, ${authorName}, ${lastMsg}, NOW(), ${JSON.stringify(chat)}, 'new', false)
        ON CONFLICT DO NOTHING
      `;
      count++;
    }
  }
  return count;
}

export default async function handler(req, res) {
   // Verify cron secret
  var authHeader = req.headers.authorization || "";
  var cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    var isVercelCron = req.headers["x-vercel-cron"];
    var isValidSecret = authHeader === "Bearer " + cronSecret;
    var hasQuerySecret = req.query.secret === cronSecret;
    if (!isVercelCron && !isValidSecret && !hasQuerySecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    var sql = neon(process.env.DATABASE_URL);
    var accounts = await sql`SELECT * FROM avito_accounts`;
    var results = [];

    for (var a = 0; a < accounts.length; a++) {
      var account = accounts[a];
      try {
        var vacCount = await syncVacancies(sql, account);
        var chatCount = await syncChats(sql, account);

        // Update addresses from raw_data
        await sql`
          UPDATE avito_vacancies 
          SET address = raw_data->>'address'
          WHERE (address IS NULL OR address = '')
          AND raw_data IS NOT NULL
          AND raw_data->>'address' IS NOT NULL
          AND raw_data->>'address' != ''
        `;

        results.push({
          account: account.name,
          vacancies: vacCount,
          new_responses: chatCount,
          status: "ok"
        });
      } catch (e) {
        results.push({
          account: account.name,
          status: "error",
          error: String(e)
        });
      }
    }

    await sql`
      INSERT INTO sync_log (synced_at, results)
      VALUES (NOW(), ${JSON.stringify(results)})
      ON CONFLICT DO NOTHING
    `;

    return res.json({ ok: true, synced_at: new Date().toISOString(), results: results });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
