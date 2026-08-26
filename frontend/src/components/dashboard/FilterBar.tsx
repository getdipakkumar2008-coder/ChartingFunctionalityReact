interface Props {
  industry: string;
  country: string;
  search: string;
  industries: string[];
  countries: string[];
  onIndustryChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onSearchChange: (v: string) => void;
}

export function FilterBar({
  industry,
  country,
  search,
  industries,
  countries,
  onIndustryChange,
  onCountryChange,
  onSearchChange,
}: Props) {
  return (
    <div className="filter-bar">
      <input
        type="search"
        placeholder="Search company…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="filter-input"
      />
      <select value={industry} onChange={(e) => onIndustryChange(e.target.value)} className="filter-select">
        <option value="">All industries</option>
        {industries.map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
      <select value={country} onChange={(e) => onCountryChange(e.target.value)} className="filter-select">
        <option value="">All countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
