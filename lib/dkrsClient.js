// lib/dkrsClient.js
export async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });

  const text = await res.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    // not json
  }

  if (!res.ok) {
    const msg =
      (json && (json.error || json.message)) ||
      `Request failed: ${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json ?? text;
    throw err;
  }

  return json;
}

export async function tryMany(endpoints) {
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      return await fetchJson(ep);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All endpoints failed");
}
