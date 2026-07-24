import { useState, useCallback } from "react";

export type DateRangeState = { range: string; start?: string; end?: string };

const RANGE_KEY = "range";

function readFromUrl(): DateRangeState {
  const params = new URLSearchParams(window.location.search);
  return {
    range: params.get(RANGE_KEY) ?? "30d",
    start: params.get("start") ?? undefined,
    end: params.get("end") ?? undefined,
  };
}

export function useDateRange() {
  const [state, setState] = useState<DateRangeState>(readFromUrl());

  const update = useCallback((next: DateRangeState) => {
    setState(next);
    const params = new URLSearchParams(window.location.search);
    params.set(RANGE_KEY, next.range);
    if (next.range === "custom" && next.start && next.end) {
      params.set("start", next.start);
      params.set("end", next.end);
    } else {
      params.delete("start");
      params.delete("end");
    }
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}?${params.toString()}`);
  }, []);

  return [state, update] as const;
}