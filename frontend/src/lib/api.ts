const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export interface LayoffRow {
  id: number;
  company: string;
  location_city: string | null;
  location_country: string | null;
  industry: string | null;
  laid_off_count: number | null;
  event_date: string | null;
  stage: string | null;
  funds_raised_m: number | null;
  source_url: string | null;
  last_seen_at: string;
}

export interface ScrapeRun {
  id: number;
  collector: "stats" | "rows";
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "failed";
  rows_scraped: number | null;
  rows_changed: number | null;
  error: string | null;
}

export interface MetaResponse {
  attribution: string;
  sourceUrl: string;
  lastSuccessfulRun: { stats: ScrapeRun | null; rows: ScrapeRun | null };
}

export interface StatsResponse {
  annual: { year: number; employees: number; companies: number }[];
  byIndustry: { industry: string; total: number }[];
  byCountry: { country: string; total: number }[];
  topCompanies: { company: string; total: number }[];
}

export interface LayoffsFilters {
  industry?: string;
  country?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

async function getJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => getJson<MetaResponse>("/meta"),
  stats: () => getJson<StatsResponse>("/stats"),
  layoffs: (filters: LayoffsFilters = {}) =>
    getJson<{ rows: LayoffRow[] }>("/layoffs", { ...filters }),
};
