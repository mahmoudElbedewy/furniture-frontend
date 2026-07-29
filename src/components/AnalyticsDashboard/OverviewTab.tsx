import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Eye, Heart, Globe, Target, AlertTriangle, Info, Zap, X, GitCompare, Activity, Crown, Search } from 'lucide-react';
import {
  fetchOverview,
  fetchAlerts,
  markAlertRead,
  fetchRealtimeAnalytics,
  fetchCustomersLTV,
  fetchSearchAnalytics,
  type OverviewData,
  type AnalyticsAlertItem,
  type RealtimeAnalyticsData,
  type CustomerLTVResponse,
  type SearchAnalyticsResponse,
} from './api';
import { OverviewSkeleton } from './Skeletons';
import type { DateRangeState } from './useDateRange';

function VisualKpiCard({
  icon: Icon,
  label,
  value,
  prevValue,
  trend,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  prevValue?: number;
  trend: number;
  accent: string;
}) {
  const isPositive = trend >= 0;
  const cur = value || 0;
  const prv = prevValue || 0;
  const maxVal = Math.max(cur, prv, 1);
  const curPct = Math.min(100, Math.round((cur / maxVal) * 100));
  const prvPct = Math.min(100, Math.round((prv / maxVal) * 100));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md transition-all hover:border-white/[0.14]">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: accent }} />

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Icon className="h-4 w-4 text-slate-300" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold ${
          isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? '+' : ''}{trend}%
        </span>
      </div>

      <p className="text-2xl font-bold tracking-tight text-slate-100 mb-3">
        {cur.toLocaleString()}
      </p>

      {/* ── Visual Bar Comparison ── */}
      <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>الفترة الحالية</span>
            <span className="font-semibold text-slate-200">{cur.toLocaleString()}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${curPct}%`, background: accent }} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>فترة المقارنة</span>
            <span className="font-medium text-slate-400">{prv.toLocaleString()}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-slate-600/50 transition-all duration-500" style={{ width: `${prvPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Severity config ──────────────────────────────────
const SEV = {
  info:     { Icon: Info,          borderClass: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300' },
  warning:  { Icon: AlertTriangle, borderClass: 'border-amber-500/20  bg-amber-500/10  text-amber-300'  },
  critical: { Icon: Zap,           borderClass: 'border-red-500/20    bg-red-500/10    text-red-300'    },
} as const;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value || 0);

type ChartAnnotation = {
  id: string;
  date: string;
  label: string;
};

function LiveAlert({ alert, onDismiss }: { alert: AnalyticsAlertItem; onDismiss: (id: number) => void }) {
  const { Icon, borderClass } = SEV[alert.severity] ?? SEV.info;
  return (
    <div className={`rounded-xl border p-4 text-sm flex items-start gap-3 ${borderClass}`} style={{ position: 'relative' }}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div style={{ flex: 1 }}>
        <span className="font-medium">{alert.message}</span>
        {alert.detail && <p className="mt-1 opacity-75 text-xs">{alert.detail}</p>}
      </div>
      {!alert.is_read && (
        <button
          onClick={() => onDismiss(alert.id)}
          title="إخفاء"
          style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: 2 }}
          className="shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function OverviewTab({ dateRange }: { dateRange: DateRangeState }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<AnalyticsAlertItem[]>([]);
  const [realtime, setRealtime] = useState<RealtimeAnalyticsData | null>(null);
  const [customersLTV, setCustomersLTV] = useState<CustomerLTVResponse | null>(null);
  const [searchAnalytics, setSearchAnalytics] = useState<SearchAnalyticsResponse | null>(null);
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('analytics_overview_annotations') || '[]') as ChartAnnotation[];
    } catch {
      return [];
    }
  });
  const [annotationDate, setAnnotationDate] = useState('');
  const [annotationLabel, setAnnotationLabel] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchOverview(dateRange).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [dateRange]);

  useEffect(() => {
    Promise.all([
      fetchRealtimeAnalytics().catch(() => null),
      fetchCustomersLTV().catch(() => null),
      fetchSearchAnalytics(dateRange).catch(() => null),
    ]).then(([realtimeData, ltvData, searchData]) => {
      setRealtime(realtimeData);
      setCustomersLTV(ltvData);
      setSearchAnalytics(searchData);
    });
  }, [dateRange]);

  useEffect(() => {
    fetchAlerts(false)
      .then((d) => setLiveAlerts(d.alerts.filter((a) => !a.is_read)))
      .catch(() => {});
  }, []);

  const handleDismiss = (id: number) => {
    markAlertRead(id).catch(() => {});
    setLiveAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const saveAnnotation = () => {
    const label = annotationLabel.trim();
    if (!annotationDate || !label) return;
    const next = [...annotations, { id: `${Date.now()}`, date: annotationDate, label }];
    setAnnotations(next);
    localStorage.setItem('analytics_overview_annotations', JSON.stringify(next));
    setAnnotationDate('');
    setAnnotationLabel('');
  };

  const removeAnnotation = (id: string) => {
    const next = annotations.filter((item) => item.id !== id);
    setAnnotations(next);
    localStorage.setItem('analytics_overview_annotations', JSON.stringify(next));
  };

  if (loading) return <OverviewSkeleton />;
  if (error) return <p className="py-12 text-center text-red-400">Error: {error}</p>;
  if (!data) return null;

  const staticAlerts = data.alerts ?? [];
  const timeSeries = data.dailyTimeSeries || [];

  return (
    <section className="space-y-8">
      {(!data.isMetaConnected || !data.isGA4Connected) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
          {!data.isMetaConnected && <p>⚠️ Facebook is not connected — go to Settings to add a token.</p>}
          {!data.isGA4Connected && <p>⚠️ GA4 is not connected — go to Settings to add your property ID and service account.</p>}
        </div>
      )}

      {/* Live DB alerts */}
      {liveAlerts.length > 0 && (
        <div className="space-y-2">
          {liveAlerts.slice(0, 5).map((a) => (
            <LiveAlert key={a.id} alert={a} onDismiss={handleDismiss} />
          ))}
        </div>
      )}

      {/* Static overview alerts */}
      {staticAlerts.map((a, i) => (
        <div key={i} className={`rounded-xl border p-4 text-sm flex items-center gap-2 ${
          a.severity === 'warning' ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
        }`}>
          <AlertTriangle className="h-4 w-4 shrink-0" /> {a.message}
        </div>
      ))}

      {/* ── KPI Grid with Visual Comparison ── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-emerald-300">زوار الآن</p>
              <p className="mt-2 text-4xl font-bold text-slate-100">
                {(realtime?.currentVisitors ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <Activity className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-xs text-emerald-200/80">
            {realtime?.source === 'ga4'
              ? 'من GA4 Realtime'
              : `من زيارات الموقع خلال آخر ${realtime?.windowMinutes ?? 5} دقائق`}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-300" />
              <h3 className="text-base font-semibold text-slate-100">أفضل العملاء حسب LTV</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-400">
              {formatCurrency(customersLTV?.summary.totalLifetimeValue ?? 0)}
            </span>
          </div>

          {customersLTV?.customers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-left text-xs text-slate-400">
                    <th className="pb-3 font-medium">العميل</th>
                    <th className="pb-3 font-medium">إجمالي الإنفاق</th>
                    <th className="pb-3 font-medium">الطلبات</th>
                    <th className="pb-3 font-medium">متوسط الطلب</th>
                  </tr>
                </thead>
                <tbody>
                  {customersLTV.customers.slice(0, 5).map((customer) => (
                    <tr key={customer.id} className="border-b border-white/[0.06] last:border-0">
                      <td className="py-3">
                        <p className="font-medium text-slate-100">{customer.fullName || customer.email}</p>
                        <p className="text-xs text-slate-500">{customer.email}</p>
                      </td>
                      <td className="py-3 font-semibold text-emerald-300">{formatCurrency(customer.lifetimeValue)}</td>
                      <td className="py-3 text-slate-300">{customer.orderCount.toLocaleString()}</td>
                      <td className="py-3 text-slate-300">{formatCurrency(customer.avgOrderValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              لا توجد طلبات مرتبطة بعملاء مسجلين حتى الآن.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-sky-300" />
            <h3 className="text-base font-semibold text-slate-100">الناس بتدور على إيه</h3>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-400">
            {searchAnalytics?.summary.totalSearches.toLocaleString() ?? 0} بحث
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-red-200">بحث بدون نتائج</p>
              <span className="text-xs text-red-200/80">
                {searchAnalytics?.summary.zeroResultRate ?? 0}%
              </span>
            </div>
            <div className="space-y-2">
              {searchAnalytics?.topNoResults.length ? (
                searchAnalytics.topNoResults.slice(0, 5).map((item) => (
                  <div key={item.query} className="flex items-center justify-between gap-3 rounded-lg border border-red-400/10 bg-red-400/10 px-3 py-2">
                    <span className="min-w-0 truncate text-sm font-medium text-slate-100">{item.query}</span>
                    <span className="shrink-0 text-xs text-red-200">{item.searchCount.toLocaleString()} مرة</span>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-red-100/70">لا توجد بحثات بدون نتائج في الفترة الحالية.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-emerald-200">بحث ناجح</p>
              <span className="text-xs text-emerald-200/80">
                {searchAnalytics?.summary.successfulSearches.toLocaleString() ?? 0} عملية
              </span>
            </div>
            <div className="space-y-2">
              {searchAnalytics?.topSuccessful.length ? (
                searchAnalytics.topSuccessful.slice(0, 5).map((item) => (
                  <div key={item.query} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400/10 bg-emerald-400/10 px-3 py-2">
                    <span className="min-w-0 truncate text-sm font-medium text-slate-100">{item.query}</span>
                    <span className="shrink-0 text-xs text-emerald-200">{item.avgResults.toLocaleString()} نتيجة</span>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-emerald-100/70">لا توجد بحثات ناجحة مسجلة في الفترة الحالية.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VisualKpiCard
          icon={Eye}
          label="Total Reach"
          value={data.kpis.totalReach}
          prevValue={data.kpis.prevTotalReach}
          trend={0}
          accent="#6366f1"
        />
        <VisualKpiCard
          icon={Heart}
          label="Total Engagement"
          value={data.kpis.totalEngagement}
          prevValue={data.kpis.prevTotalEngagement}
          trend={0}
          accent="#f472b6"
        />
        <VisualKpiCard
          icon={Globe}
          label="Website Sessions"
          value={data.kpis.websiteSessions}
          prevValue={data.kpis.prevWebsiteSessions}
          trend={data.kpis.sessionsTrend}
          accent="#34d399"
        />
        <VisualKpiCard
          icon={Target}
          label="Conversions"
          value={data.kpis.conversions}
          prevValue={data.kpis.prevConversions}
          trend={data.kpis.conversionsTrend}
          accent="#fb923c"
        />
      </div>

      {/* ── Time-Series Line / Area Charts (Current vs Comparison) ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-100">
              مقارنة الجلسات والوصول عبر الوقت (Sessions & Reach Comparison)
            </h3>
          </div>
          <span className="text-xs text-slate-400 bg-white/[0.06] px-3 py-1 rounded-full border border-white/10">
            {data.comparison?.compareTo === 'previous_year' ? 'مقارنة بالسنة السابقة' : 'مقارنة بالفترة السابقة'}
          </span>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={annotationDate}
            onChange={(e) => setAnnotationDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-200"
          />
          <input
            value={annotationLabel}
            onChange={(e) => setAnnotationLabel(e.target.value)}
            placeholder="ملاحظة"
            className="w-40 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-200"
          />
          <button
            type="button"
            onClick={saveAnnotation}
            className="rounded-lg border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-200"
          >
            حفظ
          </button>
        </div>

        {timeSeries.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSessionsCur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradSessionsPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                {annotations.map((annotation) => (
                  <ReferenceLine
                    key={annotation.id}
                    x={annotation.date.slice(5)}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{ value: annotation.label, fill: '#fbbf24', fontSize: 11 }}
                  />
                ))}
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="الجلسات (الفترة الحالية)"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#gradSessionsCur)"
                />
                <Area
                  type="monotone"
                  dataKey="prevSessions"
                  name="الجلسات (فترة المقارنة)"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#gradSessionsPrev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-10">لا توجد بيانات متسلسلة للرسم البياني في هذه الفترة</p>
        )}
      </div>

      {annotations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {annotations.map((annotation) => (
            <button
              key={annotation.id}
              type="button"
              onClick={() => removeAnnotation(annotation.id)}
              className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200"
              title="حذف"
            >
              {annotation.date}: {annotation.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md text-center">
        <p className="text-sm text-slate-400 mb-2">Content → Traffic Correlation</p>
        <p className="text-4xl font-bold text-indigo-400">{data.contentToTrafficScore}%</p>
        <p className="text-xs text-slate-500 mt-2">of website sessions in this period came from social referrals</p>
      </div>
    </section>
  );
}
