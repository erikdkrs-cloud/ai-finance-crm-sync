import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  var sql = neon(process.env.DATABASE_URL);

  if (req.method === "GET") {
    var rows = await sql`
      SELECT id, name, client_id, user_id, token_expires_at, created_at
      FROM avito_accounts ORDER BY name
    `;
    return res.json({ ok: true, data: rows });
  }

  if (req.method === "POST") {
    var body = req.body || {};
    var name = String(body.name || "").trim();
    var client_id = String(body.client_id || "").trim();
    var client_secret = String(body.client_secret || "").trim();

    if (!name || !client_id || !client_secret) {
      return res.status(400).json({ ok: false, error: "name, client_id, client_secret required" });
    }

    await sql`
      INSERT INTO avito_accounts (name, client_id, client_secret)
      VALUES (${name}, ${client_id}, ${client_secret})
    `;

    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    var id = Number(req.query.id);
    if (!id) return res.status(400).json({ ok: false, error: "id required" });
    await sql`DELETE FROM avito_responses WHERE account_id = ${id}`;
    await sql`DELETE FROM avito_vacancies WHERE account_id = ${id}`;
    await sql`DELETE FROM avito_accounts WHERE id = ${id}`;
    return res.json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
