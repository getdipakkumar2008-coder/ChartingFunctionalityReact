import cron from "node-cron";
import { scrapeAnnualStats } from "../scraper/stats.js";
import { scrapeRows } from "../scraper/rows.js";

const SCHEDULE = process.env.SCRAPE_INTERVAL_CRON ?? "0 */6 * * *"; // every 6h by default

export function registerCronJobs() {
  if (!cron.validate(SCHEDULE)) {
    throw new Error(`Invalid SCRAPE_INTERVAL_CRON expression: "${SCHEDULE}"`);
  }
  cron.schedule(SCHEDULE, async () => {
    console.log(`[cron] scrape triggered (${new Date().toISOString()})`);
    await scrapeAnnualStats();
    await scrapeRows();
  });
  console.log(`[cron] registered, schedule="${SCHEDULE}"`);
}

export async function runScrapeNow() {
  await scrapeAnnualStats();
  await scrapeRows();
}
