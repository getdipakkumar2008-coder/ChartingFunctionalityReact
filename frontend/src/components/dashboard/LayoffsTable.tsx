import type { LayoffRow } from "../../lib/api";

export function LayoffsTable({ rows }: { rows: LayoffRow[] }) {
  return (
    <div className="chart-card">
      <h2>Recent layoffs</h2>
      <div className="table-scroll">
        <table className="layoffs-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Company</th>
              <th>Industry</th>
              <th>Country</th>
              <th>Laid off</th>
              <th>Stage</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.event_date ?? "—"}</td>
                <td>{r.company}</td>
                <td>{r.industry ?? "—"}</td>
                <td>{r.location_country ?? "—"}</td>
                <td>{r.laid_off_count?.toLocaleString() ?? "—"}</td>
                <td>{r.stage ?? "—"}</td>
                <td>
                  {r.source_url?.startsWith("http") ? (
                    <a href={r.source_url} target="_blank" rel="noreferrer">
                      link
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty-state">No layoffs match the current filters.</p>}
      </div>
    </div>
  );
}
