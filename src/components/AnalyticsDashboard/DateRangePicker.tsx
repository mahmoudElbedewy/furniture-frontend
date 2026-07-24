import { useState } from "react";
import { Calendar } from "lucide-react";
import type { DateRangeState } from "./useDateRange";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "custom", label: "Custom" },
];

export default function DateRangePicker({
  value, onChange,
}: { value: DateRangeState; onChange: (v: DateRangeState) => void }) {
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-1.5">
      <Calendar className="h-4 w-4 text-slate-400 ml-1" />
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => {
            if (p.key === "custom") { setCustomOpen(true); return; }
            setCustomOpen(false);
            onChange({ range: p.key });
          }}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
            value.range === p.key ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {p.label}
        </button>
      ))}
      {customOpen && (
        <div className="flex items-center gap-1">
          <input type="date" className="rounded-lg bg-white/[0.05] px-2 py-1 text-xs text-slate-200"
            onChange={(e) => onChange({ range: "custom", start: e.target.value, end: value.end })} />
          <span className="text-slate-500 text-xs">to</span>
          <input type="date" className="rounded-lg bg-white/[0.05] px-2 py-1 text-xs text-slate-200"
            onChange={(e) => onChange({ range: "custom", start: value.start, end: e.target.value })} />
        </div>
      )}
    </div>
  );
}