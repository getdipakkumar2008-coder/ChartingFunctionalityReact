import { db } from "../db/index.js";
import { startRun, finishRun } from "../db/scrapeRuns.js";

const STATS_API_URL =
  process.env.STATS_API_URL ?? "https://layoffsfyi-production.up.railway.app/api/annual-stats";

interface AnnualStatsResponse {
  years: { year: number; employees: number; companies: number }[];
  totalEvents: number;
  totalUniqueCompanies: number;
}

export async function scrapeAnnualStats(): Promise<void> {
  const runId = startRun("stats");
  try {
    const res = await fetch(STATS_API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} from stats API`);

    const data = (await res.json()) as AnnualStatsResponse;
    if (!Array.isArray(data.years) || data.years.length === 0) {
      throw new Error("Sanity check failed: stats API returned no years");
    }

    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO annual_stats (year, employees, companies, updated_at)
      VALUES ($year, $employees, $companies, $updated_at)
      ON CONFLICT(year) DO UPDATE SET
        employees = excluded.employees,
        companies = excluded.companies,
        updated_at = excluded.updated_at
    `);

    db.exec("BEGIN");
    try {
      for (const y of data.years) {
        upsert.run({ year: y.year, employees: y.employees, companies: y.companies, updated_at: now });
      }
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }

    finishRun(runId, { status: "success", rowsScraped: data.years.length, rowsChanged: data.years.length });
    console.log(`[stats] OK — ${data.years.length} years upserted`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    finishRun(runId, { status: "failed", error: message });
    console.error(`[stats] FAILED — ${message}`);
  }
}

// Allow `npm run scrape:stats` to run this directly.
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await scrapeAnnualStats();
}
