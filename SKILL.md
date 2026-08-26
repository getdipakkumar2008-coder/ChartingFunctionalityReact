# LayoffChart — Working Notes / "Skill"

Conventions and know-how for anyone (human or Claude) working in this repo, so future
sessions don't re-derive decisions already made.

## What this project is
A React dashboard (`LayoffChart`) visualizing tech-industry layoff data sourced from
`layoffs.fyi`, kept fresh by a scheduled backend scraper (no manual re-fetching needed).
Full design rationale: `ARCHITECTURE.md`. Task breakdown: `TASK.md`. Delivery order: `PLAN.md`.

## Ground rules established for this project
- **Never scrape layoffs.fyi from the browser.** All scraping happens server-side, on a
  schedule, into our own DB. The frontend only ever talks to our own API.
- **Attribution is required** on any screen showing this data — link + "Data: layoffs.fyi" —
  because that's the condition the source site states for reuse.
- **Be polite to the source**: scrape on the order of hours, not minutes/seconds. Default
  interval is 6h, configurable via env var — don't hardcode it in multiple places.
- **Never silently overwrite good data with a broken scrape.** If a scrape parses 0 rows
  or fails a sanity check, abort the write and log `status=failed`; the dashboard should
  keep showing the last good data plus a visible "data may be stale" signal if the last
  successful run is too old.
- **SQLite first.** Don't reach for Postgres/hosted DB until there's an actual reason
  (multi-instance backend, serverless deploy). Keep the DB access layer thin enough to
  swap later.
- **Use `node:sqlite` (built-in, Node 22+), not `better-sqlite3`.** This dev machine has no
  VC++ Build Tools, so `better-sqlite3`'s native `node-gyp` build fails on install. `node:sqlite`
  needs no compilation and has the same `.prepare().run/get/all()` shape, just with `$name`
  named params instead of `@name`, and no `.transaction()` helper (use plain `BEGIN`/`COMMIT`/
  `ROLLBACK` via `db.exec`). Only revisit this if a future Node version drops `node:sqlite`.
- **On Windows, `import.meta.url === \`file://${process.argv[1]}\`` for a "run if invoked
  directly" check is wrong** — `process.argv[1]` is a Windows path (backslashes, no
  `file://`), so the comparison silently never matches and the script does nothing with
  zero error output. Use `import.meta.url === pathToFileURL(process.argv[1]).href` instead.
  Also avoid `process.exit()` right after using `node:sqlite` here — it triggered a libuv
  assertion crash on Windows (`UV_HANDLE_CLOSING`); let the process exit naturally instead.
- **Per-company row data comes from Airtable's `readSharedViewData` endpoint, not DOM
  scraping.** The embed grid is virtualized (~40 of ~4,575 rows ever in the DOM), so a
  DOM-scrape approach was a dead end. The working method: use Playwright to load the embed
  once and capture the signed request it makes to
  `GET https://airtable.com/v0.3/view/{viewId}/readSharedViewData` (URL + headers,
  especially `x-requested-with: XMLHttpRequest` and the `x-airtable-*` headers — a bare
  `fetch()` without them gets a 401), then **replay that exact request with plain `fetch()`
  outside the browser**. Calling `response.json()` or `response.body()` on this response
  *inside* Playwright reliably crashed the Chromium renderer during development (reproduced
  multiple times, including hangs that left orphaned `chrome-headless-shell.exe` processes
  needing manual cleanup) — don't try that again, replay outside the browser instead.
  Select/multiSelect fields (Industry, Country, Stage, Location HQ) come back as opaque
  choice IDs; resolve them via `column.typeOptions.choices[id].name` from the same response.
  See `backend/src/scraper/rows.ts` for the working implementation.
- **This project uses Playwright, not Puppeteer**, per explicit user preference — don't
  reintroduce Puppeteer even though early scaffolding briefly used it before the real
  Airtable approach was worked out.
- **Don't hardcode the frontend dev port in backend CORS config.** Vite falls back to
  5174, 5175, etc. if 5173 is already taken by another local project on this machine — that
  actually happened during development and caused a silent CORS failure (dashboard stuck on
  "Loading…" with no visible error except in the browser console). `backend/src/index.ts`
  now allows any `localhost:<port>` origin in dev unless `CORS_ORIGIN` is explicitly set;
  keep that behavior rather than pinning to one port number.
- **When the Chrome extension isn't connected, fall back to the project's own Playwright
  install for visual verification** — launch a throwaway script that loads the dev server,
  checks console errors, and screenshots the page. Delete the scratch script/screenshot
  afterward; don't commit them.

## Where things live (once Phase 1+ lands)
- Scraper: `backend/src/scraper/`
- DB schema/queries: `backend/src/db/`
- API routes: `backend/src/api/`
- Cron registration: `backend/src/cron/`
- Chart components: `frontend/src/components/charts/`
- Data-fetching hooks: `frontend/src/hooks/`

## Open decisions to revisit
- Charting library (Recharts assumed, see `ARCHITECTURE.md` §3.4).
- Deployment targets (see `ARCHITECTURE.md` §5 and `PLAN.md` Phase 6).

## How to keep "auto-updated" honest
Don't just trust that cron is configured — verify it's actually firing over time by
checking `scrape_runs` (or the `/api/meta` endpoint) days after deploy, not just once
locally. A cron entry that silently stops firing is worse than no cron, because the
dashboard will look fine while quietly going stale.
