import { neon } from "@neondatabase/serverless";
var avito = require("../../../lib/avito");

function findPhone(text) {
  if (!text) return null;
  var cleaned = text.replace(/[^\d+]/g, "");
  var m = cleaned.match(/[+]?[78]\d{10}/);
  return m ? m[0] : null;
}

function parseName(text) {
  if (!text) return null;
  var m = text.match(/(?:ФИО|Имя|Меня зовут|Я)\s*[\n\u2014:\-]+\s*(.+)/i);
  return m ? m[1].trim().slice(0, 100) : null;
}

function parseAge(text) {
  if (!text) return null;
  var m = text.match(/(?:Возраст|Мне|Лет)\s*[\n\u2014:\-]+\s*(\d{1,2})/i);
  return m ? m[1] : null;
}

function parseCitizenship(text) {
  if (!text) return null;
  var m = text.match(/(?:Гражданство)\s*[\n\u2014:\-]+\s*(.+)/i);
  return m ? m[1].trim().slice(0, 100) : null;
}

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
              var address = "";
              if (typeof item.address === "string") {
                address = item.address;
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

        // ===== CHATS =====
        if (mode === "all" || mode === "chats") {
          try {
            var savedOffset = null;
            if (chatPage > 0) {
              var offRow = await sql`SELECT value FROM app_settings WHERE key = ${'chat_offset_' + account.id} LIMIT 1`;
              if (offRow && offRow[0]) savedOffset = offRow[0].value;
            }

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
                  vacRow = await sql`SELECT id, title, city FROM avito_vacancies WHERE avito_id=${Number(chatItemId)} AND account_id=${account.id} LIMIT 1`;
                }
                var vacDbId = vacRow && vacRow[0] ? vacRow[0].id : null;
                var vacTitle = "";
                var vacCity = "";
                var vacAddress = "";
                var vacCode = "";

                if (vacRow && vacRow[0]) {
                  vacTitle = vacRow[0].title || "";
                  vacCity = vacRow[0].city || "";
                }
                if (chat.context && chat.context.value) {
                  if (!vacTitle) vacTitle = chat.context.value.title || "";
                  vacCode = String(chatItemId || "");
                  if (chat.context.value.location) {
                    vacAddress = chat.context.value.location.title || "";
                  }
                }

                // Get candidate info
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

                // Load first messages to extract candidate data
                var fullMessage = "";
                var candidatePhone = null;
                var candidateName = null;
                var candidateAge = null;
                var candidateCitizenship = null;
                var chatIsRead = true;

                try {
                  var msgsData = await avito.avitoFetch(
                    sql, account,
                    "/messenger/v1/accounts/" + userId + "/chats/" + chatId + "/messages/"
                  );
                  var msgs = msgsData.messages || [];
                  msgs.sort(function (a, b) { return a.created - b.created; });

                  // Check unread
                  for (var mi = 0; mi < msgs.length; mi++) {
                    if (String(msgs[mi].author_id) !== String(userId) && !msgs[mi].is_read) {
                      chatIsRead = false;
                    }
                  }

                  // Parse candidate messages
                  var allCandidateText = "";
                  for (var mi2 = 0; mi2 < msgs.length; mi2++) {
                    var mItem = msgs[mi2];
                    var mText = mItem.content ? (typeof mItem.content === "string" ? mItem.content : (mItem.content.text || "")) : "";
                    if (!mText && mItem.text) mText = mItem.text;

                    if (String(mItem.author_id) !== String(userId)) {
                      if (!fullMessage) fullMessage = mText;
                      allCandidateText += "\n" + mText;
                    }
                  }

                  candidatePhone = findPhone(allCandidateText);
                  candidateName = parseName(allCandidateText) || authorName;
                  candidateAge = parseAge(allCandidateText);
                  candidateCitizenship = parseCitizenship(allCandidateText);

                } catch (msgErr) {
                  if (chat.last_message) {
                    fullMessage = chat.last_message.text || "";
                    if (!fullMessage && chat.last_message.content) {
                      fullMessage = typeof chat.last_message.content === "string"
                        ? chat.last_message.content
                        : (chat.last_message.content.text || "");
                    }
                  }
                }

                if (!fullMessage && chat.last_message) {
                  fullMessage = chat.last_message.text || "";
                  if (!fullMessage && chat.last_message.content) {
                    fullMessage = typeof chat.last_message.content === "string"
                      ? chat.last_message.content
                      : (chat.last_message.content.text || "");
                  }
                }

                var created = chat.created ? new Date(chat.created * 1000).toISOString() : null;

                await sql`
                  INSERT INTO avito_responses (
                    vacancy_id, account_id, avito_chat_id, author_name, message,
                    phone, candidate_name, candidate_age, candidate_citizenship,
                    is_read, vacancy_address, vacancy_code,
                    created_at, raw_data
                  ) VALUES (
                    ${vacDbId}, ${account.id}, ${chatId}, ${authorName}, ${fullMessage},
                    ${candidatePhone}, ${candidateName || authorName}, ${candidateAge}, ${candidateCitizenship},
                    ${chatIsRead}, ${vacAddress || vacCity}, ${vacCode},
                    ${created},
                    ${JSON.stringify({ vacancy_title: vacTitle, vacancy_avito_id: chatItemId, location: vacAddress, candidate_user_id: candidateUserId })}
                  )
                  ON CONFLICT (avito_chat_id) DO UPDATE SET
                    author_name=EXCLUDED.author_name,
                    message=EXCLUDED.message,
                    phone=COALESCE(EXCLUDED.phone, avito_responses.phone),
                    candidate_name=COALESCE(EXCLUDED.candidate_name, avito_responses.candidate_name),
                    candidate_age=COALESCE(EXCLUDED.candidate_age, avito_responses.candidate_age),
                    candidate_citizenship=COALESCE(EXCLUDED.candidate_citizenship, avito_responses.candidate_citizenship),
                    is_read=CASE WHEN avito_responses.status = 'new' THEN EXCLUDED.is_read ELSE avito_responses.is_read END,
                    vacancy_id=COALESCE(EXCLUDED.vacancy_id, avito_responses.vacancy_id),
                    vacancy_address=COALESCE(EXCLUDED.vacancy_address, avito_responses.vacancy_address),
                    vacancy_code=COALESCE(EXCLUDED.vacancy_code, avito_responses.vacancy_code),
                    raw_data=EXCLUDED.raw_data
                `;
                totalResponses++;
              }

              lastId = chats[chats.length - 1].id;
              if (!chatsData.meta || !chatsData.meta.has_more) { keepGoing = false; }
            }

            hasMoreChats = keepGoing;
            if (lastId) {
              await sql`
                INSERT INTO app_settings (key, value) VALUES (${'chat_offset_' + account.id}, ${lastId})
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
              `;
            }

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
