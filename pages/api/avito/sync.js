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

        // ===== FETCH ITEMS via /core/v1/items =====
        var page = 1;
        var hasMore = true;
        while (hasMore) {
          var data;
          try {
            data = await avito.avitoFetch(sql, account,
              "/core/v1/items?per_page=50&page=" + page
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
              itemCategory = item.category.name || String(item.category.id || "");
            }

            var itemCity = "";
            if (item.address) {
              if (typeof item.address === "string") {
                itemCity = item.address;
              } else {
                itemCity = item.address.city || item.address.location || item.address.title || "";
              }
            }

            // Salary from price or params
            var salaryFrom = null;
            var salaryTo = null;
            if (item.price) {
              salaryFrom = Number(item.price) || null;
            }
            if (item.salary) {
              salaryFrom = item.salary.from || item.salary.min || salaryFrom;
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

          // Safety limit
          if (page > 100) break;
        }

        // ===== FETCH STATS =====
        var vacancies = await sql`
          SELECT id, avito_id FROM avito_vacancies WHERE account_id = ${account.id}
        `;

        if (vacancies.length > 0) {
          var ids = vacancies.map(function (v) { return Number(v.avito_id); });

          // Try getting stats for each item individually
          for (var si = 0; si < ids.length; si++) {
            try {
              var statData = await avito.avitoFetch(sql, account,
                "/core/v1/items/" + ids[si] + "/stats"
              );
              var totalViews = 0;
              if (statData && statData.stats) {
                statData.stats.forEach(function (d) {
                  totalViews += Number(d.uniqViews || d.views || 0);
                });
              }
              if (totalViews > 0) {
                await sql`
                  UPDATE avito_vacancies SET views = ${totalViews}
                  WHERE avito_id = ${ids[si]} AND account_id = ${account.id}
                `;
              }
            } catch (statErr) {
              // Stats endpoint may not exist — skip silently
            }

            // Don't hammer API — only check first 20
            if (si >= 20) break;
          }
        }

        // ===== FETCH CHATS (RESPONSES) =====
        try {
          var chatPage = 0;
          var hasMoreChats = true;
          var processedChats = 0;

          while (hasMoreChats) {
            var chatUrl = "/messenger/v2/accounts/" + userId + "/chats?limit=100";
            if (chatPage > 0) {
              chatUrl += "&offset=" + (chatPage * 100);
            }

            var chatsData = await avito.avitoFetch(sql, account, chatUrl);
            var chats = chatsData.chats || [];

            if (chats.length === 0) { hasMoreChats = false; break; }

            for (var c = 0; c < chats.length; c++) {
              var chat = chats[c];

              // Find linked item
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

              // Get author name
              var authorName = "";
              if (chat.users) {
                var other = chat.users.find(function (u) { return String(u.id) !== String(userId); });
                if (other) authorName = other.name || "";
              }

              // Get last message
              var lastMsg = "";
              if (chat.last_message) {
                lastMsg = chat.last_message.text || "";
                if (!lastMsg && chat.last_message.content) {
                  lastMsg = chat.last_message.content.text || "";
                }
              }

              // Parse created date
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
              processedChats++;
            }

            chatPage++;
            if (chats.length < 100) hasMoreChats = false;
            if (chatPage > 20) break; // Safety limit
          }

          totalResponses = processedChats;

          // Update response counts on vacancies
          await sql`
            UPDATE avito_vacancies v SET responses_count = (
              SELECT COUNT(*) FROM avito_responses r WHERE r.vacancy_id = v.id
            ) WHERE v.account_id = ${account.id}
          `;
        } catch (chatErr) {
          console.error("Chat error:", chatErr.message);
          errors.push({ account: account.name, warning: "Chats: " + chatErr.message });
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
