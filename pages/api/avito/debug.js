import { neon } from "@neondatabase/serverless";
var avito = require("../../../lib/avito");

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var accounts = await sql`SELECT * FROM avito_accounts LIMIT 1`;
    
    if (!accounts || !accounts[0]) {
      return res.json({ ok: false, error: "No accounts" });
    }
    
    var account = accounts[0];
    
    // Step 1: Get user info
    var userInfo = await avito.avitoFetch(sql, account, "/core/v1/accounts/self");
    var userId = userInfo.id;
    
    // Step 2: Get items (all, no filter)
    var items = await avito.avitoFetch(sql, account, 
      "/core/v1/accounts/" + userId + "/items?per_page=5&page=1"
    );
    
    // Step 3: Try with status filter
    var itemsActive = null;
    try {
      itemsActive = await avito.avitoFetch(sql, account,
        "/core/v1/accounts/" + userId + "/items?per_page=5&page=1&status=active"
      );
    } catch (e) {
      itemsActive = { error: e.message };
    }

    // Step 4: Try deprecated endpoint
    var itemsV2 = null;
    try {
      itemsV2 = await avito.avitoFetch(sql, account,
        "/core/v2/accounts/" + userId + "/items?per_page=5"
      );
    } catch (e) {
      itemsV2 = { error: e.message };
    }
    
    return res.json({
      ok: true,
      userId: userId,
      userInfo: userInfo,
      items_default: items,
      items_active: itemsActive,
      items_v2: itemsV2,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e), stack: e.stack });
  }
}
