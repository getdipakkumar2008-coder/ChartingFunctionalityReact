import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  data: { country: string; total: number }[];
}

export function ByCountryChart({ data }: Props) {
  const top = data.slice(0, 12);
  return (
    <div className="chart-card">
      <h2>Layoffs by country</h2>
      <p className="chart-subtitle">Cumulative employees laid off, current filter scope</p>
      <ResponsiveContainer width="100%" height={Math.max(260, top.length * 26)}>
        <BarChart data={top} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--gridline)" horizontal={false} />
          <XAxis
            type="number"
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="country"
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            tickLine={false}
            width={110}
          />
          <Tooltip
            cursor={{ fill: "var(--gridline)" }}
            contentStyle={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-primary)",
              fontSize: 13,
            }}
            formatter={(value) => [Number(value).toLocaleString(), "Employees laid off"]}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={16}>
            {top.map((_, i) => (
              <Cell key={i} fill="var(--series-3)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
