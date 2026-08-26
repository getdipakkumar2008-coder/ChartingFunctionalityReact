# LayoffChart — Task Tracker

Phases match `PLAN.md`. Check items off as they land.

## Phase 0 — Docs
- [x] ARCHITECTURE.md
- [x] PLAN.md
- [x] SKILL.md
- [x] TASK.md

## Phase 1 — Backend skeleton + scraper
- [x] Investigate real data sources on layoffs.fyi (done 2026-08-26 — see ARCHITECTURE.md §1:
      public annual-stats API + Airtable-embedded per-company rows)
- [x] Scaffold `backend/` (Express + TypeScript, `tsx` for dev)
- [x] Add SQLite and schema for `layoffs` + `annual_stats` + `scrape_runs` (+ `collector` col)
      — using Node's built-in `node:sqlite` (Node 22+), NOT `better-sqlite3`: this machine
      has no VC++ Build Tools for native compilation, and `node:sqlite` needs no native build.
      Revisit only if a future Node downgrade drops `node:sqlite` support.
- [x] Stats collector: fetch `layoffsfyi-production.up.railway.app/api/annual-stats`
      — **verified working against the live API**: 7 years upserted, logged in `scrape_runs`.
- [x] Captured Airtable embed's real data endpoint (`readSharedViewData`) via Playwright
      network inspection — see ARCHITECTURE.md §1. Beats DOM-scraping (grid is virtualized:
      only ~40 of ~4,575 rows ever in the DOM at once).
- [x] Rows collector: Playwright captures the signed request, replayed via plain `fetch()`
      outside the browser (in-browser `response.json()` crashed the renderer — documented
      in SKILL.md). `backend/src/scraper/rows.ts`. **Verified working: 4,575 real rows**
      scraped, parsed (industry/country/stage select-IDs resolved to names), and upserted.
- [x] Normalizer: type-cast fields, de-dupe (dedupe_key = `airtable:{recordId}`, using
      Airtable's own stable record id rather than a heuristic key), diff vs last snapshot
- [x] Upsert logic + `scrape_runs` logging (success/failure, row counts, per-collector)
- [x] `node-cron` schedule (env-configurable via `SCRAPE_INTERVAL_CRON`, default 6h)
- [x] `POST /api/admin/scrape-now` for manual testing
- [x] Manual verification: both collectors produce sane data end-to-end (scrape → DB →
      `/api/meta` and `/api/stats` confirmed returning real annual totals AND real
      by-industry/by-country/top-company aggregates from the 4,575 rows)

## Phase 2 — API
- [ ] `GET /api/meta`
- [ ] `GET /api/layoffs` (pagination + filters: date range, industry, country, search)
- [ ] `GET /api/stats` (monthly trend, by industry, by country, top companies)
- [ ] Validation + error handling + CORS

## Phase 3 — Frontend skeleton
- [x] Scaffold `frontend/` (Vite + React + TypeScript)
- [x] API client + React Query setup (`src/lib/api.ts`, `@tanstack/react-query`)
- [x] `useMeta` / `useStats` / `useLayoffs` hooks with 5-min polling (`src/hooks/useLayoffData.ts`)
- [x] Dashboard shell: layout, filter bar (industry/country/search), "Data as of" +
      attribution footer, stale-data badge if last successful rows scrape is >24h old
- [x] Loading / empty / error states

## Phase 4 — Charts
- [x] Charting lib: Recharts, palette from the `dataviz` skill's validated default
      (categorical + sequential-blue tokens as CSS custom properties, light/dark aware)
- [x] `TrendChart` (layoffs per year — annual granularity, matches what the annual-stats
      API actually provides; monthly would need bucketing the 4,575 row dates instead)
- [x] `TopCompaniesChart` (top 15 by headcount)
- [x] `ByIndustryChart` (top 12)
- [x] `ByCountryChart` (top 12)
- [x] `LayoffsTable` (filtered drill-down, scrollable with sticky header)
- [x] **Verified rendering with real data** — since the Chrome extension wasn't connected,
      used a throwaway Playwright script to load the dev server and screenshot it: all four
      charts render correctly with live scraped data, filters populate from real
      industries/countries, table shows real rows, zero console errors after the CORS fix
      below. Screenshot was for verification only, not committed.
- [x] Bug found + fixed during verification: backend CORS was hardcoded to
      `localhost:5173`, but Vite fell back to `5174` because another local project already
      had 5173 — dashboard silently failed with CORS errors. Fixed: dev CORS now allows any
      `localhost:<port>` origin unless `CORS_ORIGIN` is explicitly set (`backend/src/index.ts`).

## Phase 5 — Auto-update polish
- [ ] Confirm cron fires unattended over multiple days
- [ ] Scrape-failure alerting (log-based minimum)
- [ ] `scrape_runs` history visible somewhere for audit

## Phase 6 — Deploy
- [ ] Deploy backend with persistent storage
- [ ] Deploy frontend, point at backend API URL
- [ ] End-to-end verification in production

## Decisions needed from you (non-blocking, revisit when relevant)
- [ ] Confirm charting library choice (Recharts default)
- [ ] Confirm hosting targets for Phase 6
- [ ] Confirm scrape interval (6h default)
