import { neon } from "@neondatabase/serverless";
var avito = require("../../../lib/avito");

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var mode = req.query.mode || "all";
    var chatPage = Number(req.query.chat_page || 0);

    var accounts = await sql`SELECT * FROM avito_accounts`;
    if (!accounts || accounts.length === 0) {
      return res.json({ ok: false, error: "No accounts" });
    }

    var totalVacancies = 0;
    var totalResponses = 0;
    var errors = [];
    var hasMoreChats = false;

    for (var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      try {
        var userId = await avito.getUserId(sql, account);

        // ===== ITEMS =====
        if (mode === "all" || mode === "items") {
          var page = 1;
          var more = true;
          while (more) {
            var data;
            try {
              data = await avito.avitoFetch(sql, account, "/core/v1/items?per_page=50&page=" + page);
            } catch (e) { break; }

            var items = data.resources || [];
            if (items.length === 0) break;

            for (var j = 0; j < items.length; j++) {
              var item = items[j];
              var city = "";
              if (typeof item.address === "string") {
                city = item.address.split(",")[0].trim();
              }

              await sql`
                INSERT INTO avito_vacancies (account_id, avito_id, title, url, status, category, city, salary_from, created_at, updated_at, raw_data)
                VALUES (
                  ${account.id}, ${Number(item.id)}, ${item.title || ""},
                  ${item.url || ""}, ${item.status || "unknown"},
                  ${item.category ? (item.category.name || "") : ""},
                  ${city}, ${item.price ? Number(item.price) : null},
                  ${item.created ? new Date(item.created * 1000).toISOString() : null},
                  ${new Date().toISOString()}, ${JSON.stringify(item)}
                )
                ON CONFLICT (avito_id) DO UPDATE SET
                  title=EXCLUDED.title, url=EXCLUDED.url, status=EXCLUDED.status,
                  city=EXCLUDED.city, salary_from=EXCLUDED.salary_from,
                  updated_at=EXCLUDED.updated_at, raw_data=EXCLUDED.raw_data
              `;
              totalVacancies++;
            }
            page++;
            if (items.length < 50) more = false;
            if (page > 50) break;
          }
        }

        // ===== CHATS (batched) =====
        if (mode === "all" || mode === "chats") {
          try {
            var chatUrl = "/messenger/v2/accounts/" + userId + "/chats?limit=100";

            // Use offset for pagination across requests
            var savedOffset = null;
            if (chatPage > 0) {
              var offRow = await sql`SELECT value FROM app_settings WHERE key = ${'chat_offset_' + account.id} LIMIT 1`;
              if (offRow && offRow[0]) savedOffset = offRow[0].value;
            }
            if (savedOffset) {
              chatUrl += "&offset=" + encodeURIComponent(savedOffset);
            }

            // Fetch max 5 pages per request (500 chats) to stay under timeout
            var fetched = 0;
            var lastId = savedOffset;
            var keepGoing = true;
            var maxPages = 5;

            while (keepGoing && fetched < maxPages) {
              var url = "/messenger/v2/accounts/" + userId + "/chats?limit=100";
              if (lastId) url += "&offset=" + encodeURIComponent(lastId);

              var chatsData = await avito.avitoFetch(sql, account, url);
              var chats = chatsData.chats || [];
              fetched++;

              if (chats.length === 0) { keepGoing = false; break; }

              for (var c = 0; c < chats.length; c++) {
                var chat = chats[c];
                var chatId = String(chat.id);

                var chatItemId = null;
                if (chat.context && chat.context.value) {
                  chatItemId = chat.context.value.id;
                }

                var vacRow = null;
                if (chatItemId) {
                  vacRow = await sql`SELECT id FROM avito_vacancies WHERE avito_id=${Number(chatItemId)} AND account_id=${account.id} LIMIT 1`;
                }
                var vacDbId = vacRow && vacRow[0] ? vacRow[0].id : null;

                // Get candidate (not owner)
                var authorName = "";
                if (chat.users) {
                  for (var u = 0; u < chat.users.length; u++) {
                    if (String(chat.users[u].id) !== String(userId)) {
                      authorName = chat.users[u].name || "";
                      break;
                    }
                  }
                }

                // Message text
                var msg = "";
                if (chat.last_message) {
                  msg = chat.last_message.text || "";
                  if (!msg && chat.last_message.content) {
                    msg = typeof chat.last_message.content === "string"
                      ? chat.last_message.content
                      : (chat.last_message.content.text || "");
                  }
                }

                // Context info for raw_data
                var vacTitle = "";
                var locTitle = "";
                var priceStr = "";
                if (chat.context && chat.context.value) {
                  vacTitle = chat.context.value.title || "";
                  priceStr = chat.context.value.price_string || "";
                  if (chat.context.value.location) locTitle = chat.context.value.location.title || "";
                }

                var created = chat.created
                  ? new Date(chat.created * 1000).toISOString()
                  : null;

                await sql`
                  INSERT INTO avito_responses (vacancy_id, account_id, avito_chat_id, author_name, message, created_at, raw_data)
                  VALUES (${vacDbId}, ${account.id}, ${chatId}, ${authorName}, ${msg}, ${created},
                    ${JSON.stringify({ vacancy_title: vacTitle, vacancy_avito_id: chatItemId, location: locTitle, price_string: priceStr })}
                  )
                  ON CONFLICT (avito_chat_id) DO UPDATE SET
                    author_name=EXCLUDED.author_name, message=EXCLUDED.message,
                    vacancy_id=COALESCE(EXCLUDED.vacancy_id, avito_responses.vacancy_id),
                    raw_data=EXCLUDED.raw_data
                `;
                totalResponses++;
              }

              lastId = chats[chats.length - 1].id;

              if (!chatsData.meta || !chatsData.meta.has_more) {
                keepGoing = false;
              }
            }

            // Save offset for next batch
            hasMoreChats = keepGoing;
            if (lastId) {
              await sql`
                INSERT INTO app_settings (key, value) VALUES (${'chat_offset_' + account.id}, ${lastId})
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
              `;
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
        }

      } catch (accErr) {
        errors.push({ account: account.name, error: accErr.message });
      }
    }

    return res.json({
      ok: true,
      synced: { vacancies: totalVacancies, responses: totalResponses },
      hasMoreChats: hasMoreChats,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
