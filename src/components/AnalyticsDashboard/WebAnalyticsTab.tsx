import { useEffect, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { Clock, MousePointerClick, ArrowUpRight, Globe } from 'lucide-react';
import { fetchWebAnalytics, type WebAnalyticsData, type TopPage } from './api';
import { WebAnalyticsSkeleton } from './Skeletons';

/* ── Sparkline ───────────────────────────────────────── */
function Sparkline({ data, color }: { data: { v: number }[]; color: string }) {
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Metric Card ─────────────────────────────────────── */
function MetricCard({ icon: Icon, label, value, trend, sparkData, sparkColor }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; trend: number;
  sparkData: { v: number }[]; sparkColor: string;
}) {
  const isPositive = trend >= 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md transition-colors hover:border-white/[0.14]">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: sparkColor }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Icon className="h-4 w-4" />
          <span className="text-xs">{label}</span>
        </div>
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-100">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <span className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        <ArrowUpRight className={`h-3 w-3 ${!isPositive ? 'rotate-90' : ''}`} />
        {Math.abs(trend)}%
      </span>
    </div>
  );
}

/* ── Progress bar ────────────────────────────────────── */
function MiniProgress({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 w-full max-w-[100px] overflow-hidden rounded-full bg-white/[0.06]">
      <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function WebAnalyticsTab() {
  const [data, setData] = useState<WebAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWebAnalytics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WebAnalyticsSkeleton />;
  if (error) return <p className="py-12 text-center text-red-400">خطأ: {error}</p>;
  if (!data) return null;

  const { metrics, topPages, bounceRateSparkline, sessionDurationSparkline, totalSessionsSparkline } = data;
  const maxViews = Math.max(...topPages.map((p: TopPage) => p.views));
  const barData = topPages.slice(0, 5).map((p: TopPage) => ({
    name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
    views: p.views,
  }));

  // Traffic sources - use real data from API if available
  const trafficSources = (data as any).trafficSources || [];

  return (
    <section className="space-y-8">
      <h2 className="text-lg font-semibold text-slate-100">تحليلات الويب</h2>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard icon={MousePointerClick} label="معدل الارتداد" value={metrics.bounceRate != null ? `${metrics.bounceRate}%` : 'غير متاح'} trend={metrics.bounceRateTrend ?? 0} sparkData={bounceRateSparkline} sparkColor="#f87171" />
        <MetricCard icon={Clock} label="متوسط مدة الجلسة" value={metrics.avgSessionDuration ?? 'غير متاح'} trend={metrics.avgSessionDurationTrend ?? 0} sparkData={sessionDurationSparkline} sparkColor="#6366f1" />
        <MetricCard icon={Globe} label="إجمالي الجلسات" value={metrics.totalSessions ?? 0} trend={metrics.totalSessionsTrend ?? 0} sparkData={totalSessionsSparkline} sparkColor="#34d399" />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-medium text-slate-300">مصادر الزيارات</h3>
          {trafficSources.length > 0 ? (
            <>
              <div className="relative mx-auto h-64 w-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={trafficSources} dataKey="value" nameKey="nameAr" cx="50%" cy="50%" innerRadius={62} outerRadius={95} paddingAngle={3} strokeWidth={0}>
                      {trafficSources.map((s: any) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400">الإجمالي</span>
                  <span className="text-xl font-bold text-white">{metrics.totalSessions.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
                {trafficSources.map((s: any) => (
                  <span key={s.name} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    {s.nameAr} ({s.value.toLocaleString()})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-2xl mb-2">📊</span>
              <p className="text-sm text-slate-400">لا توجد بيانات مصادر زيارات حقيقية بعد</p>
              <p className="text-xs text-slate-500 mt-1">اربط GA4 أو انتظر تراكم الزيارات الداخلية</p>
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-medium text-slate-300">أعلى 5 صفحات مشاهدة</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={130} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="views" radius={[0, 6, 6, 0]} barSize={18}>
                  {barData.map((_, i) => <Cell key={i} fill={i === 0 ? '#6366f1' : 'rgba(99,102,241,0.45)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top pages table */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
        <h3 className="mb-4 text-sm font-medium text-slate-300">أفضل الصفحات أداءً</h3>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-right text-xs font-medium text-slate-400">
                <th className="pb-3 pr-3 font-medium">الصفحة</th>
                <th className="pb-3 pr-3 font-medium">المشاهدات</th>
                <th className="pb-3 pr-3 font-medium">الزوار الفريدون</th>
                <th className="pb-3 pr-3 font-medium">معدل الارتداد</th>
                <th className="pb-3 pr-3 font-medium">متوسط المدة</th>
              </tr>
            </thead>
            <tbody>
              {topPages.map((page: TopPage) => (
                <tr key={page.name} className="border-b border-white/[0.04] odd:bg-white/[0.02] transition-colors hover:bg-white/[0.06]">
                  <td className="py-3 pr-3 text-slate-200">{page.name}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200">{page.views.toLocaleString()}</span>
                      <MiniProgress value={page.views} max={maxViews} />
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-slate-300">{page.uniqueVisitors.toLocaleString()}</td>
                  <td className="py-3 pr-3">
                    <span className={page.bounceRate > 25 ? 'text-red-400' : 'text-emerald-400'}>
                      {page.bounceRate}%
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-slate-300">{page.avgDuration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
