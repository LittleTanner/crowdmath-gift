<div align="center">

# Crowd Math

**Mental math, disguised as a lane runner.**

Race down the lanes, answer facts before you hit the wall, and watch your speed climb.

[**Get Crowd Math on the App Store**](https://apps.apple.com/app/id6823801158)

</div>

---

## Free codes for friends and family

If I sent you here, you're on the list. Open **[crowdmath-gift.squeakbyte.com](https://crowdmath-gift.squeakbyte.com)** on your iPhone, tap **Show my code**, and you'll get a one-time App Store code that unlocks the full app for free.

1. Open the page and tap **Show my code**.
2. Copy the code, then tap **Redeem in the App Store**.
3. Enjoy Crowd Math, and if you like it, a written review means a lot.

If a code doesn't work, tap **Try another code**.

Codes expire **November 30, 2026**.

## About this repo

This is the small site behind that page. It hands each code to one person so nobody gets a code that was already used.

| Part | What it does |
|---|---|
| `index.html` | The public page, served by GitHub Pages at `crowdmath-gift.squeakbyte.com`. |
| `worker/` | A Cloudflare Worker with a D1 (SQLite) database that gives out each code once. |
| `tools/make-seed.py` | Turns a list of codes into SQL for the database. |

The codes themselves are never stored in this repo.

### How it works

- Each browser gets a random token. Reopening the page returns the same code instead of a new one.
- A code is taken with a single atomic database update, so two people can never receive the same one.
- If a code doesn't work, the page reports it and swaps in a fresh one.
- Limits keep it fair: 4 codes per browser and 12 claims per IP per day.
- "Given" means a code was shown to someone. Apple doesn't say which codes were redeemed, so that can't be confirmed.

---

## Running your own

<details>
<summary>Setup steps</summary>

1. Make a free account at dash.cloudflare.com.
2. `cd worker && npx wrangler login`
3. `npx wrangler d1 create crowdmath-gift`, then paste the `database_id` it prints into `wrangler.toml`.
4. `npx wrangler d1 execute crowdmath-gift --remote --file schema.sql`
5. Put your codes in `codes.txt` (one per line, repo root, gitignored), then from the repo root:
   `python3 tools/make-seed.py codes.txt` and `cd worker && npx wrangler d1 execute crowdmath-gift --remote --file ../seed.sql`
6. `npx wrangler secret put ADMIN_KEY` (any long random string, used to view the tally).
7. `npx wrangler deploy`. It prints `https://crowdmath-gift.<you>.workers.dev`. Put that in `index.html` (the `API` constant).
8. Push this repo and turn on GitHub Pages (Settings, Pages, deploy from `main`, root). The `CNAME` file sets the custom domain.
9. Add a DNS CNAME for your subdomain pointing to `<you>.github.io`, then tick Enforce HTTPS in Pages.

**Checking usage:** `https://<worker-url>/status?key=ADMIN_KEY` returns `{"free":N,"given":N,"bad":N}`.

**Adding more codes:** append to `codes.txt`, re-run `make-seed.py` and the `d1 execute ... seed.sql` command. Existing codes are ignored.

</details>

---

<sub>Crowd Math by Kevin Tanner. Questions: support@squeakbyte.com</sub>
