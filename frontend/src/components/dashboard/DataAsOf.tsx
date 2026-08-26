import type { MetaResponse } from "../../lib/api";

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function DataAsOf({ meta }: { meta: MetaResponse | undefined }) {
  const rowsRun = meta?.lastSuccessfulRun.rows;
  const statsRun = meta?.lastSuccessfulRun.stats;
  const stale = rowsRun?.finished_at ? Date.now() - new Date(rowsRun.finished_at).getTime() > 24 * 3600 * 1000 : true;

  return (
    <footer className="data-as-of">
      <span>
        Data as of {timeAgo(rowsRun?.finished_at)}
        {stale && <span className="stale-badge">may be stale</span>}
      </span>
      <span className="attribution">
        {meta?.attribution ?? "Data: layoffs.fyi"} ·{" "}
        <a href={meta?.sourceUrl ?? "https://layoffs.fyi/"} target="_blank" rel="noreferrer">
          layoffs.fyi
        </a>
      </span>
      {statsRun && <span className="muted-small">Annual stats updated {timeAgo(statsRun.finished_at)}</span>}
    </footer>
  );
}
