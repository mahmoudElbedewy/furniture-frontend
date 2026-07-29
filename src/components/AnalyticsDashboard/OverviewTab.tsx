import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Eye, Heart, Globe, Target, AlertTriangle } from 'lucide-react';
import { fetchOverview, type OverviewData } from './api';
import { OverviewSkeleton } from './Skeletons';
import type { DateRangeState } from './useDateRange';

function KpiCard({ icon: Icon, label, value, trend, accent }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; trend: number; accent: string;
}) {
  const isPositive = trend >= 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: accent }} />
      <div className="flex items-center gap-2 text-slate-400 mb-3">
        <Icon className="h-5 w-5" /><span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <span className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(trend)}% vs previous period
      </span>
    </div>
  );
}

export default function OverviewTab({ dateRange }: { dateRange: DateRangeState }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchOverview(dateRange).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [dateRange]);

  if (loading) return <OverviewSkeleton />;
  if (error) return <p className="py-12 text-center text-red-400">Error: {error}</p>;
  if (!data) return null;

  return (
    <section className="space-y-8">
      {(!data.isMetaConnected || !data.isGA4Connected) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
          {!data.isMetaConnected && <p>⚠️ Facebook is not connected — go to Settings to add a token.</p>}
          {!data.isGA4Connected && <p>⚠️ GA4 is not connected — go to Settings to add your property ID and service account.</p>}
        </div>
      )}

      {data.alerts.map((a, i) => (
        <div key={i} className={`rounded-xl border p-4 text-sm flex items-center gap-2 ${
          a.severity === 'warning' ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
        }`}>
          <AlertTriangle className="h-4 w-4 shrink-0" /> {a.message}
        </div>
      ))}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Eye} label="Total Reach" value={data.kpis.totalReach.toLocaleString()} trend={0} accent="#6366f1" />
        <KpiCard icon={Heart} label="Total Engagement" value={data.kpis.totalEngagement.toLocaleString()} trend={0} accent="#f472b6" />
        <KpiCard icon={Globe} label="Website Sessions" value={data.kpis.websiteSessions.toLocaleString()} trend={data.kpis.sessionsTrend} accent="#34d399" />
        <KpiCard icon={Target} label="Conversions" value={data.kpis.conversions.toLocaleString()} trend={data.kpis.conversionsTrend} accent="#fb923c" />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md text-center">
        <p className="text-sm text-slate-400 mb-2">Content → Traffic Correlation</p>
        <p className="text-4xl font-bold text-indigo-400">{data.contentToTrafficScore}%</p>
        <p className="text-xs text-slate-500 mt-2">of website sessions in this period came from social referrals</p>
      </div>
    </section>
  );
}