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

        // ===== FETCH VACANCIES =====
        var page = 1;
        var hasMore = true;
        while (hasMore) {
          var data;
          try {
            data = await avito.avitoFetch(sql, account,
              "/core/v1/accounts/" + userId + "/items?per_page=50&page=" + page
            );
          } catch (fetchErr) {
            console.error("Items fetch error page " + page + ":", fetchErr.message);
            break;
          }

          var items = data.resources || [];
          if (items.length === 0) { hasMore = false; break; }

          for (var j = 0; j < items.length; j++) {
            var item = items[j];
            var avitoId = Number(item.id);
            var itemTitle = item.title || "";
            var itemUrl = item.url || ("https://www.avito.ru/" + avitoId);
            var itemStatus = item.status || "unknown";
            var itemCategory = "";
            if (item.category) {
              itemCategory = item.category.name || item.category.id || "";
            }
            var itemCity = "";
            if (item.address) {
              itemCity = typeof item.address === "string" ? item.address : (item.address.city || item.address.location || "");
            }

            var salaryFrom = null;
            var salaryTo = null;
            if (item.salary) {
              salaryFrom = item.salary.from || item.salary.min || null;
              salaryTo = item.salary.to || item.salary.max || null;
            }
            if (item.params) {
              item.params.forEach(function (p) {
                if (p.id === "salary" || p.id === "compensation") {
                  if (p.value && typeof p.value === "object") {
                    salaryFrom = salaryFrom || p.value.from || p.value.min || null;
                    salaryTo = salaryTo || p.value.to || p.value.max || null;
                  }
                }
              });
            }

            var createdAt = item.created || item.time || null;
            if (createdAt && typeof createdAt === "number") {
              createdAt = new Date(createdAt * 1000).toISOString();
            }

            await sql`
              INSERT INTO avito_vacancies (account_id, avito_id, title, url, status, category, city, salary_from, salary_to, created_at, updated_at, raw_data)
              VALUES (
                ${account.id}, ${avitoId}, ${itemTitle}, ${itemUrl},
                ${itemStatus}, ${itemCategory}, ${itemCity},
                ${salaryFrom}, ${salaryTo},
                ${createdAt}, ${new Date().toISOString()}, ${JSON.stringify(item)}
              )
              ON CONFLICT (avito_id) DO UPDATE SET
                title = EXCLUDED.title, url = EXCLUDED.url, status = EXCLUDED.status,
                category = EXCLUDED.category, city = EXCLUDED.city,
                salary_from = EXCLUDED.salary_from, salary_to = EXCLUDED.salary_to,
                updated_at = EXCLUDED.updated_at, raw_data = EXCLUDED.raw_data
            `;
            totalVacancies++;
          }

          page++;
          if (items.length < 50) hasMore = false;
        }

        // ===== FETCH STATS =====
        var vacancies = await sql`
          SELECT id, avito_id FROM avito_vacancies WHERE account_id = ${account.id}
        `;

        if (vacancies.length > 0) {
          var ids = vacancies.map(function (v) { return Number(v.avito_id); });
          var batchSize = 200;

          for (var b = 0; b < ids.length; b += batchSize) {
            var batch = ids.slice(b, b + batchSize);
            try {
              var today = new Date().toISOString().slice(0, 10);
              var yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

              var statsData = await avito.avitoFetch(sql, account,
                "/core/v1/accounts/" + userId + "/stats/items",
                {
                  method: "POST",
                  body: JSON.stringify({
                    dateFrom: yearAgo,
                    dateTo: today,
                    itemIds: batch,
                    fields: ["uniqViews", "uniqContacts", "uniqFavorites"]
                  }),
                }
              );

              var statsItems = statsData.result && statsData.result.items || statsData.items || [];
              for (var s = 0; s < statsItems.length; s++) {
                var stat = statsItems[s];
                var statItemId = stat.itemId || stat.item_id;
                var totalViews = 0;
                var statDays = stat.stats || stat.days || [];
                statDays.forEach(function (d) {
                  totalViews += Number(d.uniqViews || d.views || 0);
                });
                if (statItemId) {
                  await sql`
                    UPDATE avito_vacancies SET views = ${totalViews}
                    WHERE avito_id = ${statItemId} AND account_id = ${account.id}
                  `;
                }
              }
            } catch (statsErr) {
              console.error("Stats error:", statsErr.message);
            }
          }
        }

        // ===== FETCH CHATS (RESPONSES) =====
        try {
          var chatsData = await avito.avitoFetch(sql, account,
            "/messenger/v2/accounts/" + userId + "/chats?chat_type=u2i&limit=100"
          );

          var chats = chatsData.chats || [];
          for (var c = 0; c < chats.length; c++) {
            var chat = chats[c];

            var chatItemId = null;
            if (chat.context && chat.context.value) {
              chatItemId = chat.context.value.id || chat.context.value.item_id;
            }

            var vacRow = null;
            if (chatItemId) {
              vacRow = await sql`
                SELECT id FROM avito_vacancies WHERE avito_id = ${chatItemId} AND account_id = ${account.id} LIMIT 1
              `;
            }
            var vacancyDbId = vacRow && vacRow[0] ? vacRow[0].id : null;

            var authorName = "";
            if (chat.users) {
              var other = chat.users.find(function (u) { return String(u.id) !== String(userId); });
              if (other) authorName = other.name || "";
            }

            var lastMsg = "";
            if (chat.last_message) {
              lastMsg = chat.last_message.text || "";
              if (!lastMsg && chat.last_message.content) {
                lastMsg = chat.last_message.content.text || "";
              }
            }

            var chatCreated = null;
            if (chat.created) {
              chatCreated = typeof chat.created === "number"
                ? new Date(chat.created * 1000).toISOString()
                : chat.created;
            }

            var chatId = String(chat.id);

            await sql`
              INSERT INTO avito_responses (vacancy_id, account_id, avito_chat_id, author_name, message, created_at, raw_data)
              VALUES (${vacancyDbId}, ${account.id}, ${chatId}, ${authorName}, ${lastMsg}, ${chatCreated}, ${JSON.stringify(chat)})
              ON CONFLICT (avito_chat_id) DO UPDATE SET
                author_name = EXCLUDED.author_name,
                message = EXCLUDED.message,
                raw_data = EXCLUDED.raw_data
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
