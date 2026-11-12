// Hands each offer code to one person. Codes live only in D1, never in the public page.
// SQLite runs each statement atomically, so two visitors can never be given the same code.
const MAX_PER_TOKEN = 4;   // codes one browser can be given, counting retries
const MAX_PER_IP_DAY = 12; // claims per network per day, so one person cannot drain the pool
const OFFER_ENDS = Date.UTC(2026, 11, 1, 8); // after Nov 30 everywhere; Apple's own expiry still applies

const json = (body, status, cors) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });

async function ipKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Take the next free code for this token. One statement, so it is atomic.
async function take(db, token) {
  const r = await db
    .prepare(
      `UPDATE codes SET status='given', token=?1, given_at=?2
       WHERE code = (SELECT code FROM codes WHERE status='free' ORDER BY rowid LIMIT 1)
       RETURNING code`
    )
    .bind(token, Date.now())
    .first();
  return r ? r.code : null;
}

async function overIpLimit(db, request) {
  const ip = await ipKey(request), day = new Date().toISOString().slice(0, 10);
  const r = await db
    .prepare(`INSERT INTO ipdays (ip, day, n) VALUES (?1, ?2, 1)
              ON CONFLICT(ip, day) DO UPDATE SET n = n + 1 RETURNING n`)
    .bind(ip, day)
    .first();
  return r.n > MAX_PER_IP_DAY;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const ok = origin === env.ALLOWED_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(origin);
    const cors = ok ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : { "Vary": "Origin" };
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });

    // Private tally for the owner: /status?key=ADMIN_KEY
    if (request.method === "GET" && url.pathname === "/status") {
      if (!env.ADMIN_KEY || url.searchParams.get("key") !== env.ADMIN_KEY) return json({ error: "no" }, 404, {});
      const { results } = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM codes GROUP BY status").all();
      return json(Object.fromEntries(results.map((r) => [r.status, r.n])), 200, {});
    }

    if (request.method !== "POST" || !ok) return json({ error: "no" }, 404, cors);
    if (Date.now() >= OFFER_ENDS) return json({ error: "ended" }, 410, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad" }, 400, cors); }
    const token = String(body.token || "");
    if (!/^[0-9a-f]{32}$/.test(token)) return json({ error: "bad" }, 400, cors);
    const db = env.DB;

    if (url.pathname === "/claim") {
      // Same browser asking again gets the code it already has.
      const have = await db.prepare("SELECT code FROM codes WHERE token=?1 AND status IN ('given','redeemed') ORDER BY given_at DESC LIMIT 1").bind(token).first();
      if (have) return json({ code: have.code }, 200, cors);
      if (await overIpLimit(db, request)) return json({ error: "limit" }, 429, cors);
      const code = await take(db, token);
      return code ? json({ code }, 200, cors) : json({ error: "out" }, 503, cors);
    }

    if (url.pathname === "/next") {
      const used = await db.prepare("SELECT COUNT(*) AS n FROM codes WHERE token=?1").bind(token).first();
      if (used.n >= MAX_PER_TOKEN) return json({ error: "limit" }, 429, cors);
      if (await overIpLimit(db, request)) return json({ error: "limit" }, 429, cors);
      // Retire the code that did not work (only if it was this browser's), then hand out a fresh one.
      await db.prepare("UPDATE codes SET status='bad' WHERE code=?1 AND token=?2 AND status IN ('given','redeemed')").bind(String(body.code || ""), token).run();
      const code = await take(db, token);
      return code ? json({ code }, 200, cors) : json({ error: "out" }, 503, cors);
    }

    // The visitor tapped "Redeem in the App Store". Showing a code only holds it for them (given);
    // this tap is what counts it as used (redeemed). Still not proof Apple accepted it.
    if (url.pathname === "/redeem") {
      await db.prepare("UPDATE codes SET status='redeemed' WHERE code=?1 AND token=?2 AND status='given'").bind(String(body.code || ""), token).run();
      return json({ ok: true }, 200, cors);
    }

    return json({ error: "no" }, 404, cors);
  },
};
