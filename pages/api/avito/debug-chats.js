import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    var sql = neon(process.env.DATABASE_URL);
    var accounts = await sql`SELECT * FROM avito_accounts LIMIT 1`;
    var account = accounts[0];
    
    // Try to refresh token
    var refreshRes = await fetch("https://api.avito.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=refresh_token&refresh_token=" + account.refresh_token + "&client_id=" + account.client_id + "&client_secret=" + account.client_secret
    });
    var refreshText = await refreshRes.text();
    
    return res.json({
      refresh_status: refreshRes.status,
      refresh_response: refreshText.substring(0, 500),
      has_refresh_token: !!account.refresh_token,
      has_client_id: !!account.client_id,
      has_client_secret: !!account.client_secret,
      token_updated_at: account.updated_at,
      refresh_token_first_20: account.refresh_token ? account.refresh_token.substring(0, 20) + "..." : "NONE"
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
