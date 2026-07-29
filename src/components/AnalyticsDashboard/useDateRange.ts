import { useState, useCallback } from "react";

export type CompareMode = "previous_period" | "previous_year" | "none";

export type DateRangeState = {
  range: string;
  start?: string;
  end?: string;
  compareTo?: CompareMode;
};

const RANGE_KEY = "range";
const COMPARE_KEY = "compare_to";

function readFromUrl(): DateRangeState {
  const params = new URLSearchParams(window.location.search);
  const compareTo = (params.get(COMPARE_KEY) as CompareMode) ?? "previous_period";
  return {
    range: params.get(RANGE_KEY) ?? "30d",
    start: params.get("start") ?? undefined,
    end: params.get("end") ?? undefined,
    compareTo,
  };
}

export function useDateRange() {
  const [state, setState] = useState<DateRangeState>(readFromUrl());

  const update = useCallback((next: DateRangeState) => {
    const updatedState = { ...next, compareTo: next.compareTo ?? "previous_period" };
    setState(updatedState);

    const params = new URLSearchParams(window.location.search);
    params.set(RANGE_KEY, updatedState.range);
    if (updatedState.compareTo) {
      params.set(COMPARE_KEY, updatedState.compareTo);
    } else {
      params.delete(COMPARE_KEY);
    }

    if (updatedState.range === "custom" && updatedState.start && updatedState.end) {
      params.set("start", updatedState.start);
      params.set("end", updatedState.end);
    } else {
      params.delete("start");
      params.delete("end");
    }
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}?${params.toString()}`);
  }, []);

  return [state, update] as const;
}