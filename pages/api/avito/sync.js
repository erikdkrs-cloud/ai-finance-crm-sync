import { neon } from "@neondatabase/serverless";
var avito = require("../../../lib/avito");

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var accountId = Number(req.query.account_id || 0);

    var accounts;
    if (accountId) {
      accounts = await sql`SELECT * FROM avito_accounts WHERE id = ${accountId}`;
    } else {
      accounts = await sql`SELECT * FROM avito_accounts`;
    }

    if (!accounts || accounts.length === 0) {
      return res.json({ ok: false, error: "No accounts found" });
    }

    var totalVacancies = 0;
    var totalResponses = 0;
    var errors = [];

    for (var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      try {
        var userId = await avito.getUserId(sql, account);

        // Fetch vacancies (items)
        var page = 1;
        var hasMore = true;
        while (hasMore) {
          var data = await avito.avitoFetch(sql, account,
            "/core/v1/accounts/" + userId + "/items?per_page=50&page=" + page +
            "&category=110&status=active,removed,blocked,old"
          );

          var items = data.resources || [];
          if (items.length === 0) { hasMore = false; break; }

          for (var j = 0; j < items.length; j++) {
            var item = items[j];
            var avitoId = Number(item.id);

            await sql`
              INSERT INTO avito_vacancies (account_id, avito_id, title, url, status, category, city, salary_from, salary_to, created_at, updated_at, raw_data)
              VALUES (
                ${account.id}, ${avitoId}, ${item.title || ""}, ${item.url || ""},
                ${item.status || ""}, ${item.category && item.category.name || ""},
                ${item.address || ""}, ${item.salary_from || null}, ${item.salary_to || null},
                ${item.created || null}, ${new Date().toISOString()}, ${JSON.stringify(item)}
              )
              ON CONFLICT (avito_id) DO UPDATE SET
                title = EXCLUDED.title, url = EXCLUDED.url, status = EXCLUDED.status,
                city = EXCLUDED.city, salary_from = EXCLUDED.salary_from, salary_to = EXCLUDED.salary_to,
                updated_at = EXCLUDED.updated_at, raw_data = EXCLUDED.raw_data
            `;
            totalVacancies++;
          }

          page++;
          if (items.length < 50) hasMore = false;
        }

        // Fetch stats for vacancies
        var vacancies = await sql`
          SELECT id, avito_id FROM avito_vacancies WHERE account_id = ${account.id}
        `;

        // Get stats in batch (up to 200)
        if (vacancies.length > 0) {
          var ids = vacancies.map(function (v) { return v.avito_id; });
          var batchSize = 200;
          for (var b = 0; b < ids.length; b += batchSize) {
            var batch = ids.slice(b, b + batchSize);
            try {
              var statsData = await avito.avitoFetch(sql, account,
                "/core/v1/accounts/" + userId + "/items/stats/",
                {
                  method: "POST",
                  body: JSON.stringify({ itemIds: batch, dateFrom: "2024-01-01", dateTo: new Date().toISOString().slice(0, 10), fields: ["views", "contacts"] }),
                }
              );

              if (statsData && statsData.result && statsData.result.items) {
                for (var s = 0; s < statsData.result.items.length; s++) {
                  var stat = statsData.result.items[s];
                  var totalViews = 0;
                  if (stat.stats) {
                    stat.stats.forEach(function (d) { totalViews += Number(d.views || d.uniqViews || 0); });
                  }
                  await sql`
                    UPDATE avito_vacancies SET views = ${totalViews}
                    WHERE avito_id = ${stat.itemId} AND account_id = ${account.id}
                  `;
                }
              }
            } catch (statsErr) {
              console.error("Stats error:", statsErr.message);
            }
          }
        }

        // Fetch responses (chats)
        try {
          var chatsData = await avito.avitoFetch(sql, account,
            "/messenger/v2/accounts/" + userId + "/chats?item_types=job&limit=100"
          );

          var chats = chatsData.chats || [];
          for (var c = 0; c < chats.length; c++) {
            var chat = chats[c];
            var chatItemId = chat.context && chat.context.value && chat.context.value.id;
            if (!chatItemId) continue;

            var vacRow = await sql`
              SELECT id FROM avito_vacancies WHERE avito_id = ${chatItemId} AND account_id = ${account.id} LIMIT 1
            `;
            var vacancyDbId = vacRow && vacRow[0] ? vacRow[0].id : null;

            var authorName = "";
            if (chat.users) {
              var other = chat.users.find(function (u) { return String(u.id) !== String(userId); });
              if (other) authorName = other.name || "";
            }

            var lastMsg = chat.last_message ? (chat.last_message.text || chat.last_message.content && chat.last_message.content.text || "") : "";
            var chatCreated = chat.created ? new Date(chat.created * 1000).toISOString() : null;

            await sql`
              INSERT INTO avito_responses (vacancy_id, account_id, avito_chat_id, author_name, message, created_at, raw_data)
              VALUES (${vacancyDbId}, ${account.id}, ${chat.id}, ${authorName}, ${lastMsg}, ${chatCreated}, ${JSON.stringify(chat)})
              ON CONFLICT DO NOTHING
            `;
            totalResponses++;
          }

          // Update response counts
          await sql`
            UPDATE avito_vacancies v SET responses_count = (
              SELECT COUNT(*) FROM avito_responses r WHERE r.vacancy_id = v.id
            ) WHERE v.account_id = ${account.id}
          `;
        } catch (chatErr) {
          console.error("Chat error:", chatErr.message);
        }

      } catch (accErr) {
        errors.push({ account: account.name, error: accErr.message });
      }
    }

    return res.json({
      ok: true,
      synced: { vacancies: totalVacancies, responses: totalResponses },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
