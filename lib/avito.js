var AVITO_API = "https://api.avito.ru";

async function getAccessToken(sql, account) {
  // Check if token is still valid (with 5 min buffer)
  if (account.access_token && account.token_expires_at) {
    var expires = new Date(account.token_expires_at);
    if (expires > new Date(Date.now() + 5 * 60 * 1000)) {
      return account.access_token;
    }
  }

  // Get new token
  var res = await fetch(AVITO_API + "/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&client_id=" +
      encodeURIComponent(account.client_id) +
      "&client_secret=" + encodeURIComponent(account.client_secret),
  });

  if (!res.ok) {
    var text = await res.text();
    throw new Error("Avito auth error: " + res.status + " " + text);
  }

  var data = await res.json();
  var token = data.access_token;
  var expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

  // Save token to DB
  await sql`
    UPDATE avito_accounts
    SET access_token = ${token}, token_expires_at = ${expiresAt.toISOString()}
    WHERE id = ${account.id}
  `;

  return token;
}

async function avitoFetch(sql, account, path, options) {
  var token = await getAccessToken(sql, account);
  var url = AVITO_API + path;
  var opts = Object.assign({}, options || {}, {
    headers: Object.assign({
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
    }, (options && options.headers) || {}),
  });

  var res = await fetch(url, opts);
  if (!res.ok) {
    var text = await res.text();
    throw new Error("Avito API " + res.status + ": " + text);
  }
  return res.json();
}

async function getUserId(sql, account) {
  if (account.user_id) return account.user_id;
  var data = await avitoFetch(sql, account, "/core/v1/accounts/self");
  var userId = data.id;
  await sql`UPDATE avito_accounts SET user_id = ${userId} WHERE id = ${account.id}`;
  return userId;
}

module.exports = { getAccessToken: getAccessToken, avitoFetch: avitoFetch, getUserId: getUserId };
