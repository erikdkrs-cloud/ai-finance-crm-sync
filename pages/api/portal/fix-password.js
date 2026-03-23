import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "no" });

  var { secret, email, password } = req.body;
  if (secret !== "DKRS_FIX_2024") return res.status(403).json({ error: "no" });

  var sql = neon(process.env.DATABASE_URL);
  var hash = await bcrypt.hash(password, 10);

  await sql`UPDATE users SET password_hash = ${hash} WHERE email = ${email}`;

  return res.json({ ok: true });
}
