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

        // ===== FETCH ITEMS =====
        var page = 1;
        var hasMore = true;
        while (hasMore) {
          var data;
          try {
            data = await avito.avitoFetch(sql, account,
              "/core/v1/items?per_page=50&page=" + page
            );
          } catch (e) { break; }

          var items = data.resources || [];
          if (items.length === 0) break;

          for (var j = 0; j < items.length; j++) {
            var item = items[j];
            var avitoId = Number(item.id);
            var itemCity = "";
            if (typeof item.address === "string") {
              // Extract city from full address
              var parts = item.address.split(",");
              itemCity = parts[0].trim();
            } else if (item.address) {
              itemCity = item.address.city || item.address.title || "";
            }

            var salaryFrom = item.price ? Number(item.price) : null;
            var createdAt = item.created || item.time || null;
            if (createdAt && typeof createdAt === "number") {
              createdAt = new Date(createdAt * 1000).toISOString();
            }

            await sql`
              INSERT INTO avito_vacancies (account_id, avito_id, title, url, status, category, city, salary_from, salary_to, created_at, updated_at, raw_data)
              VALUES (
                ${account.id}, ${avitoId}, ${item.title || ""},
                ${item.url || "https://www.avito.ru/" + avitoId},
                ${item.status || "unknown"},
                ${item.category ? (item.category.name || "") : ""},
                ${itemCity}, ${salaryFrom}, ${null},
                ${createdAt}, ${new Date().toISOString()}, ${JSON.stringify(item)}
              )
              ON CONFLICT (avito_id) DO UPDATE SET
                title = EXCLUDED.title, url = EXCLUDED.url, status = EXCLUDED.status,
                category = EXCLUDED.category, city = EXCLUDED.city,
                salary_from = EXCLUDED.salary_from,
                updated_at = EXCLUDED.updated_at, raw_data = EXCLUDED.raw_data
            `;
            totalVacancies++;
          }

          page++;
          if (items.length < 50) hasMore = false;
          if (page > 100) break;
        }

        // ===== FETCH CHATS =====
        try {
          var allChats = [];
          var chatOffset = null;
          var hasMoreChats = true;

          while (hasMoreChats) {
            var chatUrl = "/messenger/v2/accounts/" + userId + "/chats?limit=100";
            if (chatOffset) {
              chatUrl += "&offset=" + chatOffset;
            }

            var chatsData = await avito.avitoFetch(sql, account, chatUrl);
            var chats = chatsData.chats || [];
            if (chats.length === 0) break;

            allChats = allChats.concat(chats);

            // Check pagination
            if (chatsData.meta && chatsData.meta.has_more && chats.length > 0) {
              chatOffset = chats[chats.length - 1].id;
            } else {
              hasMoreChats = false;
            }

            if (allChats.length > 2000) break;
          }

          for (var c = 0; c < allChats.length; c++) {
            var chat = allChats[c];
            var chatId = String(chat.id);

            // Find linked vacancy
            var chatItemId = null;
            if (chat.context && chat.context.value) {
              chatItemId = chat.context.value.id || chat.context.value.item_id;
            }

            var vacRow = null;
            if (chatItemId) {
              vacRow = await sql`
                SELECT id FROM avito_vacancies
                WHERE avito_id = ${Number(chatItemId)} AND account_id = ${account.id}
                LIMIT 1
              `;
            }
            var vacancyDbId = vacRow && vacRow[0] ? vacRow[0].id : null;

            // Get candidate name (not DKRS)
            var authorName = "";
            var candidateUserId = null;
            if (chat.users) {
              for (var u = 0; u < chat.users.length; u++) {
                if (String(chat.users[u].id) !== String(userId)) {
                  authorName = chat.users[u].name || "";
                  candidateUserId = chat.users[u].id;
                  break;
                }
              }
            }

            // Get last message text
            var lastMsg = "";
            if (chat.last_message) {
              if (typeof chat.last_message === "object") {
                if (chat.last_message.text) {
                  lastMsg = chat.last_message.text;
                } else if (chat.last_message.content) {
                  if (typeof chat.last_message.content === "string") {
                    lastMsg = chat.last_message.content;
                  } else if (chat.last_message.content.text) {
                    lastMsg = chat.last_message.content.text;
                  }
                }
              }
            }

            // Get vacancy title from context
            var vacancyTitle = "";
            if (chat.context && chat.context.value) {
              vacancyTitle = chat.context.value.title || "";
            }

            // Parse created
            var chatCreated = null;
            if (chat.created) {
              chatCreated = typeof chat.created === "number"
                ? new Date(chat.created * 1000).toISOString()
                : chat.created;
            }

            await sql`
              INSERT INTO avito_responses (vacancy_id, account_id, avito_chat_id, author_name, message, created_at, raw_data)
              VALUES (${vacancyDbId}, ${account.id}, ${chatId}, ${authorName}, ${lastMsg}, ${chatCreated}, ${JSON.stringify({
                chat_id: chatId,
                candidate_name: authorName,
                candidate_user_id: candidateUserId,
                vacancy_title: vacancyTitle,
                vacancy_avito_id: chatItemId,
                location: chat.context && chat.context.value && chat.context.value.location || null,
                price_string: chat.context && chat.context.value && chat.context.value.price_string || null,
              })})
              ON CONFLICT (avito_chat_id) DO UPDATE SET
                author_name = EXCLUDED.author_name,
                message = EXCLUDED.message,
                vacancy_id = COALESCE(EXCLUDED.vacancy_id, avito_responses.vacancy_id),
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
