import { useMemo, useState } from "react";
import { useLayoffs, useMeta, useStats } from "./hooks/useLayoffData";
import { TrendChart } from "./components/charts/TrendChart";
import { TopCompaniesChart } from "./components/charts/TopCompaniesChart";
import { ByIndustryChart } from "./components/charts/ByIndustryChart";
import { ByCountryChart } from "./components/charts/ByCountryChart";
import { FilterBar } from "./components/dashboard/FilterBar";
import { DataAsOf } from "./components/dashboard/DataAsOf";
import { LayoffsTable } from "./components/dashboard/LayoffsTable";
import "./App.css";

export default function App() {
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState("");

  const meta = useMeta();
  const stats = useStats();
  const layoffs = useLayoffs({ industry, country, search, limit: 200 });

  const industries = useMemo(
    () => (stats.data?.byIndustry ?? []).map((d) => d.industry).filter(Boolean),
    [stats.data]
  );
  const countries = useMemo(
    () => (stats.data?.byCountry ?? []).map((d) => d.country).filter(Boolean),
    [stats.data]
  );

  const loading = stats.isLoading || meta.isLoading;
  const error = stats.error || meta.error;

  return (
    <>
      <header className="dashboard-header">
        <h1>LayoffChart</h1>
        <p>Tech industry layoff trends, sourced from layoffs.fyi and kept fresh automatically.</p>
      </header>

      <FilterBar
        industry={industry}
        country={country}
        search={search}
        industries={industries}
        countries={countries}
        onIndustryChange={setIndustry}
        onCountryChange={setCountry}
        onSearchChange={setSearch}
      />

      {loading && <p className="empty-state">Loading layoff data…</p>}
      {error && <p className="error-state">Couldn't reach the API — is the backend running on VITE_API_URL?</p>}

      {stats.data && (
        <div className="chart-grid">
          <TrendChart data={stats.data.annual} />
          <TopCompaniesChart data={stats.data.topCompanies} />
          <ByIndustryChart data={stats.data.byIndustry} />
          <ByCountryChart data={stats.data.byCountry} />
        </div>
      )}

      {layoffs.data && <LayoffsTable rows={layoffs.data.rows} />}

      <DataAsOf meta={meta.data} />
    </>
  );
}
