export default function handler(req, res) {
  const envToken = (process.env.CRM_SYNC_TOKEN || "").trim();
  const headerToken = String(req.headers["x-crm-sync-token"] || "").trim();

  res.status(200).json({
    ok: true,
    has_env_token: !!envToken,
    env_len: envToken.length,
    header_present: !!headerToken,
    header_len: headerToken.length,
    match: !!envToken && !!headerToken && envToken === headerToken,
  });
}
