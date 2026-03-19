import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  var sql = neon(process.env.DATABASE_URL);
  var body = req.body;
  var response_id = body.response_id;
  var message_template = body.message_template;

  if (!response_id) return res.status(400).json({ ok: false, error: "response_id required" });

  try {
    var rows = await sql`
      SELECT r.id, r.avito_chat_id, r.account_id, r.author_name, v.title as vacancy_title
      FROM avito_responses r
      LEFT JOIN avito_vacancies v ON v.id = r.vacancy_id
      WHERE r.id = ${response_id}
    `;
    if (rows.length === 0) return res.status(404).json({ ok: false, error: "Not found" });

    var resp = rows[0];
    if (!resp.avito_chat_id) return res.status(400).json({ ok: false, error: "No chat_id" });

    var accs = await sql`
      SELECT user_id, client_id, client_secret, access_token, token_expires_at
      FROM avito_accounts WHERE id = ${resp.account_id}
    `;
    if (accs.length === 0) return res.status(404).json({ ok: false, error: "Account not found" });

    var acc = accs[0];

    // Refresh token if expired
    var token = acc.access_token;
    var now = Date.now();
    if (!token || (acc.token_expires_at && new Date(acc.token_expires_at).getTime() < now)) {
      var tokenRes = await fetch("https://api.avito.ru/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials&client_id=" + acc.client_id + "&client_secret=" + acc.client_secret
      });
      var tokenData = await tokenRes.json();
      if (!tokenData.access_token) return res.status(500).json({ ok: false, error: "Token refresh failed" });
      token = tokenData.access_token;
      var expiresAt = new Date(now + (tokenData.expires_in || 3600) * 1000).toISOString();
      await sql`UPDATE avito_accounts SET access_token = ${token}, token_expires_at = ${expiresAt} WHERE id = ${resp.account_id}`;
    }

    var msgText = message_template ||
      "Здравствуйте! К сожалению, по вакансии \"" + (resp.vacancy_title || "") + "\" мы вынуждены отказать. Благодарим за интерес к нашей компании и желаем успехов в поиске работы!";

    var apiRes = await fetch(
      "https://api.avito.ru/messenger/v1/accounts/" + acc.user_id + "/chats/" + resp.avito_chat_id + "/messages",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: { text: msgText }, type: "text" })
      }
    );

    if (!apiRes.ok) {
      var errText = await apiRes.text();
      return res.status(apiRes.status).json({ ok: false, error: "Avito: " + errText });
    }

    await sql`UPDATE avito_responses SET status = 'rejected' WHERE id = ${response_id}`;

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
