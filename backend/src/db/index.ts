import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "./data/layoffchart.sqlite";
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS layoffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  location_city TEXT,
  location_country TEXT,
  industry TEXT,
  laid_off_count INTEGER,
  event_date TEXT,
  stage TEXT,
  funds_raised_m REAL,
  source_url TEXT,
  dedupe_key TEXT NOT NULL UNIQUE,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS annual_stats (
  year INTEGER PRIMARY KEY,
  employees INTEGER NOT NULL,
  companies INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collector TEXT NOT NULL,           -- 'stats' | 'rows'
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,              -- 'running' | 'success' | 'failed'
  rows_scraped INTEGER,
  rows_changed INTEGER,
  error TEXT
);
`);
