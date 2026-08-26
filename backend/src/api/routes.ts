import { Router } from "express";
import { db } from "../db/index.js";
import { lastSuccessfulRun } from "../db/scrapeRuns.js";
import { runScrapeNow } from "../cron/index.js";

export const router = Router();

router.get("/meta", (_req, res) => {
  const stats = lastSuccessfulRun("stats");
  const rows = lastSuccessfulRun("rows");
  res.json({
    attribution: "Data: layoffs.fyi",
    sourceUrl: "https://layoffs.fyi/",
    lastSuccessfulRun: { stats, rows },
  });
});

router.get("/layoffs", (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const offset = Number(req.query.offset ?? 0);
  const { industry, country, search } = req.query;

  const clauses: string[] = [];
  const params: Record<string, string | number | null> = { limit, offset };
  if (typeof industry === "string") {
    clauses.push("industry = $industry");
    params.industry = industry;
  }
  if (typeof country === "string") {
    clauses.push("location_country = $country");
    params.country = country;
  }
  if (typeof search === "string") {
    clauses.push("company LIKE $search");
    params.search = `%${search}%`;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = db
    .prepare(`SELECT * FROM layoffs ${where} ORDER BY event_date DESC LIMIT $limit OFFSET $offset`)
    .all(params);
  res.json({ rows });
});

router.get("/stats", (_req, res) => {
  const annual = db.prepare(`SELECT * FROM annual_stats ORDER BY year ASC`).all();
  const byIndustry = db
    .prepare(
      `SELECT industry, SUM(laid_off_count) AS total FROM layoffs WHERE industry IS NOT NULL GROUP BY industry ORDER BY total DESC`
    )
    .all();
  const byCountry = db
    .prepare(
      `SELECT location_country AS country, SUM(laid_off_count) AS total FROM layoffs WHERE location_country IS NOT NULL GROUP BY location_country ORDER BY total DESC`
    )
    .all();
  const topCompanies = db
    .prepare(
      `SELECT company, SUM(laid_off_count) AS total FROM layoffs GROUP BY company ORDER BY total DESC LIMIT 15`
    )
    .all();
  res.json({ annual, byIndustry, byCountry, topCompanies });
});

router.post("/admin/scrape-now", async (_req, res) => {
  await runScrapeNow();
  res.json({ ok: true });
});
