import { useState } from "react";
import { Calendar, GitCompare } from "lucide-react";
import type { DateRangeState, CompareMode } from "./useDateRange";

const PRESETS = [
  { key: "today", label: "اليوم" },
  { key: "7d", label: "7 أيام" },
  { key: "30d", label: "30 يوم" },
  { key: "90d", label: "90 يوم" },
  { key: "custom", label: "مخصص" },
];

const COMPARE_OPTIONS: { key: CompareMode; label: string }[] = [
  { key: "previous_period", label: "الفترة السابقة" },
  { key: "previous_year", label: "السنة السابقة" },
  { key: "none", label: "إيقاف المقارنة" },
];

export default function DateRangePicker({
  value, onChange,
}: { value: DateRangeState; onChange: (v: DateRangeState) => void }) {
  const [customOpen, setCustomOpen] = useState(value.range === "custom");

  const currentCompare = value.compareTo ?? "previous_period";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1.5 backdrop-blur-md">
      <div className="flex items-center gap-1.5 pl-1">
        <Calendar className="h-4 w-4 text-slate-400" />
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              if (p.key === "custom") { setCustomOpen(true); return; }
              setCustomOpen(false);
              onChange({ ...value, range: p.key });
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              value.range === p.key ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {customOpen && (
        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
          <input
            type="date"
            value={value.start ?? ""}
            className="rounded-lg bg-white/[0.08] px-2 py-1 text-xs text-slate-200 border border-white/10"
            onChange={(e) => onChange({ ...value, range: "custom", start: e.target.value })}
          />
          <span className="text-slate-500 text-xs">إلى</span>
          <input
            type="date"
            value={value.end ?? ""}
            className="rounded-lg bg-white/[0.08] px-2 py-1 text-xs text-slate-200 border border-white/10"
            onChange={(e) => onChange({ ...value, range: "custom", end: e.target.value })}
          />
        </div>
      )}

      {/* ── Compare Periods Selector ── */}
      <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 mr-1">
        <GitCompare className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs text-slate-400 font-medium">مقارنة:</span>
        <select
          value={currentCompare}
          onChange={(e) => onChange({ ...value, compareTo: e.target.value as CompareMode })}
          className="rounded-lg bg-white/[0.08] px-2 py-1 text-xs text-slate-200 border border-white/10 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{ colorScheme: "dark" }}
        >
          {COMPARE_OPTIONS.map((c) => (
            <option key={c.key} value={c.key} className="bg-slate-900 text-slate-200">
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}