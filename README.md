# Crowd Math gift page

`index.html` is the public page (GitHub Pages). `worker/` is a Cloudflare Worker with a D1 database that hands each
offer code to one person. The codes live only in D1, never in this repo. Tools: `tools/make-seed.py`.

## One-time setup

1. Cloudflare: make a free account at dash.cloudflare.com.
2. `cd worker && npx wrangler login`
3. `npx wrangler d1 create crowdmath-gift`, then paste the `database_id` it prints into `wrangler.toml`.
4. `npx wrangler d1 execute crowdmath-gift --remote --file schema.sql`
5. Put all 499 + 60 codes in `codes.txt` (one per line, repo root; it is gitignored), then from the repo root:
   `python3 tools/make-seed.py codes.txt` and `cd worker && npx wrangler d1 execute crowdmath-gift --remote --file ../seed.sql`
6. `npx wrangler secret put ADMIN_KEY` (any long random string; used to view the tally).
7. `npx wrangler deploy`. It prints `https://crowdmath-gift.<you>.workers.dev`. Put that in `index.html` (the `API` constant).
8. GitHub: push this repo (public) and turn on Pages (Settings, Pages, deploy from `main`, root). The `CNAME` file is already here.
9. Squarespace: Settings, Domains, squeakbyte.com, DNS Settings, add CNAME `crowdmath-gift` -> `littletanner.github.io`.
   Then in GitHub Pages set the custom domain to `crowdmath-gift.squeakbyte.com` and tick Enforce HTTPS.

## Checking usage

`https://<worker-url>/status?key=ADMIN_KEY` returns `{"free":N,"given":N,"bad":N}`.
"given" means shown to a person, not confirmed redeemed (Apple does not expose that).

## Adding more codes later

Append to `codes.txt`, re-run `make-seed.py` and the `d1 execute ... seed.sql` command. Existing codes are ignored.
