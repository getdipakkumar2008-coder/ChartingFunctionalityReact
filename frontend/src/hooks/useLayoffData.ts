import { useQuery } from "@tanstack/react-query";
import { api, type LayoffsFilters } from "../lib/api";

// The backend cron refreshes every few hours; polling every 5 min here is what makes the
// dashboard itself "auto-updated" without a manual reload.
const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useMeta() {
  return useQuery({ queryKey: ["meta"], queryFn: api.meta, refetchInterval: POLL_INTERVAL_MS });
}

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: api.stats, refetchInterval: POLL_INTERVAL_MS });
}

export function useLayoffs(filters: LayoffsFilters) {
  return useQuery({
    queryKey: ["layoffs", filters],
    queryFn: () => api.layoffs(filters),
    refetchInterval: POLL_INTERVAL_MS,
  });
}
