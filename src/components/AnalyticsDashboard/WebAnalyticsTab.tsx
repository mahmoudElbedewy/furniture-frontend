import { useEffect, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Legend, AreaChart, Area,
} from 'recharts';
import { Clock, MousePointerClick, Globe, ArrowUpRight, ArrowDownRight, GitCompare } from 'lucide-react';
import { fetchWebAnalytics, type WebAnalyticsData, type TopPage } from './api';
import { WebAnalyticsSkeleton } from './Skeletons';
import type { DateRangeState } from './useDateRange';

/* ── Visual Comparison Metric Card ── */
function VisualMetricCard({
  icon: Icon,
  label,
  value,
  prevValue,
  trend,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  prevValue?: string | number;
  trend: number;
  color: string;
}) {
  const isPositive = trend >= 0;
  const numVal = typeof value === 'number' ? value : parseFloat(value as string) || 0;
  const numPrev = typeof prevValue === 'number' ? prevValue : parseFloat((prevValue as string) || '0') || 0;
  const maxVal = Math.max(numVal, numPrev, 1);
  const curPct = Math.min(100, Math.round((numVal / maxVal) * 100));
  const prvPct = Math.min(100, Math.round((numPrev / maxVal) * 100));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md transition-all hover:border-white/[0.14]">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: color }} />

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Icon className="h-4 w-4 text-slate-300" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold ${
          isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {isPositive ? '+' : ''}{trend}%
        </span>
      </div>

      <p className="text-2xl font-bold tracking-tight text-slate-100 mb-3">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      {/* Visual comparison bars */}
      <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>الفترة الحالية</span>
            <span className="font-semibold text-slate-200">{value}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${curPct}%`, background: color }} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>فترة المقارنة</span>
            <span className="font-medium text-slate-400">{prevValue ?? '—'}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-slate-600/50 transition-all duration-500" style={{ width: `${prvPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Progress bar ── */
function MiniProgress({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 w-full max-w-[100px] overflow-hidden rounded-full bg-white/[0.06]">
      <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function WebAnalyticsTab({ dateRange }: { dateRange?: DateRangeState }) {
  const [data, setData] = useState<WebAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchWebAnalytics(dateRange)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateRange]);

  if (loading) return <WebAnalyticsSkeleton />;
  if (error) return <p className="py-12 text-center text-red-400">خطأ: {error}</p>;
  if (!data) return null;

  const { metrics, topPages, dailySeries = [] } = data;
  const maxViews = Math.max(...topPages.map((p: TopPage) => p.views), 1);
  const barData = topPages.slice(0, 5).map((p: TopPage) => ({
    name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
    views: p.views,
  }));

  const trafficSources = data.trafficSources || [];

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">تحليلات الويب</h2>
        {data.comparison?.compareTo && (
          <span className="text-xs text-slate-400 bg-white/[0.06] px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
            <GitCompare size={13} className="text-amber-400" />
            {data.comparison.compareTo === 'previous_year' ? 'مقارنة بالسنة السابقة' : 'مقارنة بالفترة السابقة'}
          </span>
        )}
      </div>

      {/* Visual Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <VisualMetricCard
          icon={MousePointerClick}
          label="معدل الارتداد (Bounce Rate)"
          value={metrics.bounceRate != null ? `${metrics.bounceRate}%` : 'غير متاح'}
          prevValue={metrics.prevBounceRate != null ? `${metrics.prevBounceRate}%` : 'غير متاح'}
          trend={metrics.bounceRateTrend ?? 0}
          color="#f87171"
        />
        <VisualMetricCard
          icon={Clock}
          label="متوسط مدة الجلسة"
          value={metrics.avgSessionDuration ?? 'غير متاح'}
          prevValue={metrics.prevAvgSessionDuration ?? 'غير متاح'}
          trend={metrics.avgSessionDurationTrend ?? 0}
          color="#6366f1"
        />
        <VisualMetricCard
          icon={Globe}
          label="إجمالي الجلسات"
          value={metrics.totalSessions ?? 0}
          prevValue={metrics.prevTotalSessions ?? 0}
          trend={metrics.totalSessionsTrend ?? 0}
          color="#34d399"
        />
      </div>

      {/* ── Time-Series Comparison Line Chart ── */}
      {dailySeries.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-medium text-slate-300">
            مقارنة الجلسات اليومية عبر الوقت (Daily Sessions Comparison)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="webGradCur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="webGradPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="الجلسات (الفترة الحالية)"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#webGradCur)"
                />
                <Area
                  type="monotone"
                  dataKey="prevSessions"
                  name="الجلسات (فترة المقارنة)"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#webGradPrev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
