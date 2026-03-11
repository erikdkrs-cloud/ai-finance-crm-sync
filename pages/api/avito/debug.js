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

    // Step 1: Get token
    var tokenRes = await fetch(AVITO + "/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials&client_id=" +
        encodeURIComponent(account.client_id) +
        "&client_secret=" + encodeURIComponent(account.client_secret),
    });

    var tokenText = await tokenRes.text();
    var tokenData;
    try { tokenData = JSON.parse(tokenText); } catch (e) { tokenData = tokenText; }

    if (!tokenRes.ok) {
      return res.json({ ok: false, step: "token", status: tokenRes.status, response: tokenData });
    }

    var token = tokenData.access_token;
    var headers = { "Authorization": "Bearer " + token };

    // Step 2: Try different user endpoints
    var results = {};

    var endpoints = [
      { name: "self_v1", url: "/core/v1/accounts/self" },
      { name: "self_v2", url: "/core/v2/accounts/self" },
      { name: "self_no_core", url: "/v1/accounts/self" },
      { name: "profile", url: "/api/1/profile" },
      { name: "user", url: "/coreapi/v1/accounts/self" },
    ];

    for (var i = 0; i < endpoints.length; i++) {
      var ep = endpoints[i];
      try {
        var r = await fetch(AVITO + ep.url, { headers: headers });
        var text = await r.text();
        var data;
        try { data = JSON.parse(text); } catch (e) { data = text; }
        results[ep.name] = { status: r.status, data: data };
      } catch (e) {
        results[ep.name] = { error: e.message };
      }
    }

    // Step 3: If we found userId, try items
    var userId = null;
    Object.keys(results).forEach(function (key) {
      var r = results[key];
      if (r.status === 200 && r.data && r.data.id) {
        userId = r.data.id;
      }
    });

    var itemsResults = {};
    if (userId) {
      var itemEndpoints = [
        { name: "items_v1", url: "/core/v1/accounts/" + userId + "/items?per_page=3" },
        { name: "items_v2", url: "/core/v2/accounts/" + userId + "/items?per_page=3" },
        { name: "items_v1_noparams", url: "/core/v1/accounts/" + userId + "/items" },
      ];

      for (var j = 0; j < itemEndpoints.length; j++) {
        var iep = itemEndpoints[j];
        try {
          var ir = await fetch(AVITO + iep.url, { headers: headers });
          var itext = await ir.text();
          var idata;
          try { idata = JSON.parse(itext); } catch (e) { idata = itext; }
          itemsResults[iep.name] = { status: ir.status, data: idata };
        } catch (e) {
          itemsResults[iep.name] = { error: e.message };
        }
      }
    }

    return res.json({
      ok: true,
      token_ok: true,
      token_expires_in: tokenData.expires_in,
      user_endpoints: results,
      found_userId: userId,
      items_endpoints: itemsResults,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
