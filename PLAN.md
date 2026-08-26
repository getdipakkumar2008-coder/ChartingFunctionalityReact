# LayoffChart — Implementation Plan

See `ARCHITECTURE.md` for the system design this plan implements, and `TASK.md` for the
checked-off/pending task breakdown.

## Repo layout

```
reactappchart/
  backend/                 Node/Express API + scraper + cron
    src/
      scraper/              fetch + parse + normalize + diff
      db/                    schema, migrations, queries
      api/                   route handlers
      cron/                  schedule registration
    package.json
  frontend/                 Vite + React dashboard
    src/
      components/charts/     LayoffChart family (Trend, ByIndustry, ByCountry, TopCompanies)
      components/dashboard/  Shell, FilterBar, DataAsOf, LayoffsTable
      hooks/                 useLayoffStats, useLayoffs (React Query)
      lib/                   API client, formatters
    package.json
  ARCHITECTURE.md
  PLAN.md
  SKILL.md
  TASK.md
```

## Phased delivery

### Phase 0 — Docs
- `ARCHITECTURE.md`, `PLAN.md`, `SKILL.md`, `TASK.md` in place. Done.

### Phase 1 — Backend skeleton + scraper (no charts yet)
Real data-source investigation done (see `ARCHITECTURE.md` §1): layoffs.fyi has one public
annual-stats JSON API, and per-company rows only exist inside an Airtable embed (client-
rendered, needs a headless browser). Plan reflects that:

1. Scaffold `backend/` (Express, TypeScript, SQLite via `better-sqlite3`).
2. **Stats collector**: plain `fetch` against
   `https://layoffsfyi-production.up.railway.app/api/annual-stats`. This part is simple and
   already verified working — do it first for an early end-to-end win.
3. **Rows collector** — done (2026-08-26): Playwright loads the Airtable embed URL just
   long enough to capture the signed `readSharedViewData` request it makes, then that exact
   request is replayed with plain `fetch()` outside the browser to get all ~4,575 rows in
   one JSON call (see `ARCHITECTURE.md` §1 for why DOM-scraping and in-browser
   `response.json()` were both ruled out). Implementation: `backend/src/scraper/rows.ts`.
4. Define the `layoffs` and `scrape_runs` schema; write the normalizer + diff/upsert logic
   (schema needs a `source` column: `'stats'` vs `'rows'`, since these are independent feeds).
5. Wire `node-cron` to run both collectors on an interval (configurable via env var,
   default 6h) plus a manual `POST /api/admin/scrape-now` for testing.
6. Manually verify one full scrape of each collector populates the DB with sane data.

### Phase 2 — API
1. `GET /api/meta` — last run time, status, row count.
2. `GET /api/layoffs` — paginated, filterable raw rows.
3. `GET /api/stats` — aggregates for the four charts (by month, by industry, by country,
   top companies). Keep aggregation logic in SQL where practical.
4. Basic input validation + error responses; CORS enabled for the frontend origin.

### Phase 3 — Frontend skeleton
1. Scaffold `frontend/` (Vite + React + TypeScript).
2. API client + React Query setup, `useLayoffStats`/`useLayoffs` hooks with polling.
3. Dashboard shell: layout, filter bar (date range/industry/country/search), "Data as of"
   + attribution footer, loading/empty/error states.

### Phase 4 — Charts
1. Pick charting lib (default: Recharts — see open question in `ARCHITECTURE.md`).
2. `TrendChart` — layoffs per month.
3. `TopCompaniesChart` — bar, top 15 by headcount.
4. `ByIndustryChart` — bar or treemap.
5. `ByCountryChart` — bar (or map if time allows).
6. `LayoffsTable` — drill-down table beneath charts, respects active filters.

### Phase 5 — Auto-update polish
1. Confirm cron actually re-runs unattended over a multi-day window.
2. Add scrape failure alerting (log-based is fine to start; email/webhook optional).
3. Add `scrape_runs` history view somewhere (even just an admin JSON endpoint) so you can
   audit that updates are actually happening.

### Phase 6 — Deploy
1. Deploy backend (Render/Railway/Fly.io — pick one) with a persistent volume for SQLite,
   or move to hosted Postgres if deploying serverless.
2. Deploy frontend (Vercel/Netlify) pointed at the backend API URL.
3. Confirm the whole loop end-to-end in production: cron fires → data updates → dashboard
   reflects it within its polling interval, with no manual step.

## Decisions still open (flagged, not blocking Phase 0)
- Charting library: Recharts assumed — say if you'd rather use something else.
- Hosting targets for Phase 6 — can decide when we get there.
- Scrape interval — 6h assumed; layoffs.fyi doesn't update by the minute so this is
  plenty fresh, but easy to change via env var.

## Suggested order of work from here
Once you confirm the plan, the natural next step is **Phase 1**: scaffold `backend/`
and get one real scrape of `layoffs.fyi` parsed and stored. Everything else depends on
seeing the actual HTML structure of that table, so that's the first thing worth doing
in code rather than in docs.
