import { chromium } from "playwright";
import { db } from "../db/index.js";
import { startRun, finishRun } from "../db/scrapeRuns.js";

const AIRTABLE_EMBED_URL =
  process.env.AIRTABLE_EMBED_URL ??
  "https://airtable.com/embed/app1PaujS9zxVGUZ4/shroKsHx3SdYYOzeh?backgroundColor=green&viewControls=on";

// Abort the write if the new row count drops more than this fraction vs the last
// successful run — most likely means the capture failed, not that layoffs genuinely
// disappeared from history.
const MAX_ROW_DROP_FRACTION = 0.5;

interface ScrapedRow {
  airtableRecordId: string;
  company: string;
  locationCity?: string;
  locationCountry?: string;
  industry?: string;
  laidOffCount?: number;
  eventDate?: string;
  stage?: string;
  fundsRaisedM?: number;
  sourceUrl?: string;
}

interface AirtableColumn {
  id: string;
  name: string;
  type: string;
  typeOptions?: { choices?: Record<string, { id: string; name: string }> } | null;
}

interface AirtableRow {
  id: string;
  createdTime: string;
  cellValuesByColumnId: Record<string, unknown>;
}

interface AirtableReadSharedViewData {
  msg: string;
  data: { table: { columns: AirtableColumn[]; rows: AirtableRow[] } };
}

/**
 * The Airtable embed at AIRTABLE_EMBED_URL is a client-rendered app — the grid virtualizes
 * rows, so scraping the DOM would only ever see ~40 rows at a time out of ~4500+ total, and
 * columns are keyed by opaque field IDs that only resolve to names via the app's own state.
 *
 * Instead: launch a real browser once to capture the exact signed request (URL + headers)
 * the embed itself uses to fetch its data — `GET /v0.3/view/{viewId}/readSharedViewData` —
 * then replay that *exact* request with plain `fetch()` outside the browser. This returns
 * every row (verified: 4575 rows in one call) plus the column schema needed to resolve
 * select/multiSelect field IDs to display names. Calling `response.json()` /
 * `response.body()` *inside* Playwright on this particular response reliably crashes the
 * Chromium renderer (reproduced repeatedly during development) — replaying outside the
 * browser avoids that entirely and is also cheaper (no need to keep the browser alive while
 * downloading ~3MB of JSON).
 *
 * The captured URL includes a signed `accessPolicy` with an `expires` several weeks out, but
 * treat it as capture-per-run rather than something to cache long-term — it's an
 * undocumented endpoint and could change shape or expire faster without notice.
 */
async function fetchAirtableData(): Promise<AirtableReadSharedViewData> {
  const browser = await chromium.launch();
  let capturedUrl: string | null = null;
  let capturedHeaders: Record<string, string> | null = null;

  try {
    const page = await browser.newPage();
    page.on("request", (req) => {
      const u = req.url();
      if (!capturedUrl && u.includes("readSharedViewData") && !u.includes("allowMsgpackOfResult")) {
        capturedUrl = u;
        capturedHeaders = req.headers();
      }
    });

    await page.goto(AIRTABLE_EMBED_URL, { waitUntil: "load", timeout: 30_000 });
    await page.waitForTimeout(3_000);
  } finally {
    await browser.close();
  }

  if (!capturedUrl || !capturedHeaders) {
    throw new Error("Failed to capture Airtable readSharedViewData request from embed page load");
  }

  const res = await fetch(capturedUrl as string, {
    headers: { ...(capturedHeaders as Record<string, string>), accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Airtable data endpoint returned HTTP ${res.status}`);
  }
  const body = (await res.json()) as AirtableReadSharedViewData;
  if (body.msg !== "SUCCESS") {
    throw new Error(`Airtable data endpoint returned msg="${body.msg}", expected SUCCESS`);
  }
  return body;
}

function resolveChoice(col: AirtableColumn | undefined, value: unknown): string | undefined {
  if (!col || value == null) return undefined;
  const choices = col.typeOptions?.choices;
  if (col.type === "select" && typeof value === "string") {
    return choices?.[value]?.name ?? value;
  }
  if (col.type === "multiSelect" && Array.isArray(value)) {
    return value.map((id) => choices?.[id as string]?.name ?? String(id)).join(", ");
  }
  return typeof value === "string" ? value : undefined;
}

function parseRows(body: AirtableReadSharedViewData): ScrapedRow[] {
  const columns = body.data.table.columns;
  const byName = (name: string) => columns.find((c) => c.name === name);

  const companyCol = byName("Company");
  const locationCol = byName("Location HQ");
  const countCol = byName("# Laid Off");
  const dateCol = byName("Date");
  const industryCol = byName("Industry");
  const sourceCol = byName("Source");
  const stageCol = byName("Stage");
  const fundsCol = byName("$ Raised (mm)");
  const countryCol = byName("Country");

  if (!companyCol || !countCol || !dateCol) {
    throw new Error("Sanity check failed: expected Airtable columns (Company/# Laid Off/Date) not found");
  }

  return body.data.table.rows
    .map((row): ScrapedRow => {
      const cells = row.cellValuesByColumnId;
      const laidOffRaw = companyCol && countCol ? cells[countCol.id] : undefined;
      return {
        airtableRecordId: row.id,
        company: String(cells[companyCol.id] ?? ""),
        locationCity: resolveChoice(locationCol, cells[locationCol?.id ?? ""]),
        locationCountry: resolveChoice(countryCol, cells[countryCol?.id ?? ""]),
        industry: resolveChoice(industryCol, cells[industryCol?.id ?? ""]),
        laidOffCount: typeof laidOffRaw === "number" ? laidOffRaw : undefined,
        eventDate: typeof cells[dateCol.id] === "string" ? (cells[dateCol.id] as string).slice(0, 10) : undefined,
        stage: resolveChoice(stageCol, cells[stageCol?.id ?? ""]),
        fundsRaisedM: sourceCol && typeof cells[fundsCol?.id ?? ""] === "number" ? (cells[fundsCol!.id] as number) : undefined,
        sourceUrl: sourceCol && typeof cells[sourceCol.id] === "string" ? (cells[sourceCol.id] as string) : undefined,
      };
    })
    .filter((r) => r.company);
}

export async function scrapeRows(): Promise<void> {
  const runId = startRun("rows");
  try {
    const previousCount = (
      db.prepare(`SELECT COUNT(*) AS n FROM layoffs`).get() as unknown as { n: number }
    ).n;

    const body = await fetchAirtableData();
    const rows = parseRows(body);

    if (rows.length === 0) {
      throw new Error("Sanity check failed: parsed 0 rows from Airtable data");
    }
    if (previousCount > 0 && rows.length < previousCount * (1 - MAX_ROW_DROP_FRACTION)) {
      throw new Error(
        `Sanity check failed: row count dropped from ${previousCount} to ${rows.length} (>${
          MAX_ROW_DROP_FRACTION * 100
        }% drop)`
      );
    }

    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO layoffs (
        company, location_city, location_country, industry, laid_off_count,
        event_date, stage, funds_raised_m, source_url, dedupe_key, first_seen_at, last_seen_at
      ) VALUES (
        $company, $locationCity, $locationCountry, $industry, $laidOffCount,
        $eventDate, $stage, $fundsRaisedM, $sourceUrl, $dedupeKey, $now, $now
      )
      ON CONFLICT(dedupe_key) DO UPDATE SET
        last_seen_at = $now,
        laid_off_count = $laidOffCount,
        stage = $stage,
        funds_raised_m = $fundsRaisedM
    `);

    let changed = 0;
    db.exec("BEGIN");
    try {
      for (const row of rows) {
        const info = upsert.run({
          company: row.company,
          locationCity: row.locationCity ?? null,
          locationCountry: row.locationCountry ?? null,
          industry: row.industry ?? null,
          laidOffCount: row.laidOffCount ?? null,
          eventDate: row.eventDate ?? null,
          stage: row.stage ?? null,
          fundsRaisedM: row.fundsRaisedM ?? null,
          sourceUrl: row.sourceUrl ?? null,
          // Airtable's own record id is a stable, globally-unique key — far more reliable
          // for de-duping across runs than a heuristic company+date+count composite.
          dedupeKey: `airtable:${row.airtableRecordId}`,
          now,
        });
        if (info.changes > 0) changed++;
      }
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }

    finishRun(runId, { status: "success", rowsScraped: rows.length, rowsChanged: changed });
    console.log(`[rows] OK — ${rows.length} rows scraped, ${changed} changed`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    finishRun(runId, { status: "failed", error: message });
    console.error(`[rows] FAILED — ${message}`);
  }
}

import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await scrapeRows();
}
