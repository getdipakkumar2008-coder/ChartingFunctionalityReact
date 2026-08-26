import { db } from "./index.js";

export type Collector = "stats" | "rows";

export function startRun(collector: Collector): number {
  const stmt = db.prepare(
    `INSERT INTO scrape_runs (collector, started_at, status) VALUES ($collector, $startedAt, 'running')`
  );
  const info = stmt.run({ collector, startedAt: new Date().toISOString() });
  return Number(info.lastInsertRowid);
}

export function finishRun(
  runId: number,
  result: { status: "success" | "failed"; rowsScraped?: number; rowsChanged?: number; error?: string }
) {
  db.prepare(
    `UPDATE scrape_runs SET finished_at = $finishedAt, status = $status, rows_scraped = $rowsScraped, rows_changed = $rowsChanged, error = $error WHERE id = $runId`
  ).run({
    finishedAt: new Date().toISOString(),
    status: result.status,
    rowsScraped: result.rowsScraped ?? null,
    rowsChanged: result.rowsChanged ?? null,
    error: result.error ?? null,
    runId,
  });
}

export function lastSuccessfulRun(collector: Collector) {
  return db
    .prepare(
      `SELECT * FROM scrape_runs WHERE collector = $collector AND status = 'success' ORDER BY finished_at DESC LIMIT 1`
    )
    .get({ collector });
}
