import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Globe, Heart, MousePointerClick } from 'lucide-react';
import { fetchOverview, type OverviewData, type TrafficSource } from './api';

const formatNum = (n: number) => n.toLocaleString('en-US');

/* ── Custom chart tooltip ────────────────────────────── */
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#131824]/90 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <p className="mb-1 text-slate-400">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatNum(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ── KPI Card ────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, trend, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: number;
  accent: string;
}) {
  const isPositive = trend >= 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md transition-all duration-300 hover:border-white/[0.14] hover:scale-[1.02]">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: accent }} />
      <div className="flex items-center gap-2 text-slate-400 mb-3">
        <Icon className="h-5 w-5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-100">{value}</p>
      <span className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(trend)}%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      <span className="mr-3 text-slate-400">جاري تحميل البيانات...</span>
    </div>
  );
  if (error) return <p className="py-12 text-center text-red-400">خطأ: {error}</p>;
  if (!data) return null;

  const { kpi, monthlyTraffic, trafficSources } = data;

  return (
    <section className="space-y-8">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="إجمالي الزوار" value={formatNum(kpi.totalVisitors)} trend={kpi.visitorsTrend} accent="#6366f1" />
        <KpiCard icon={Globe} label="وصول ميتا" value={formatNum(kpi.metaReach)} trend={kpi.reachTrend} accent="#f472b6" />
        <KpiCard icon={Heart} label="معدل التفاعل" value={`${kpi.engagementRate}%`} trend={kpi.engagementTrend} accent="#fb923c" />
        <KpiCard icon={MousePointerClick} label="معدل التحويل" value={`${kpi.conversionRate}%`} trend={kpi.conversionTrend} accent="#34d399" />
      </div>

      {/* Main Area Chart */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
        <h3 className="mb-4 text-sm font-medium text-slate-300">زيارات الموقع مقابل الوصول الاجتماعي</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTraffic}>
              <defs>
                <linearGradient id="gWebVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSocialReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={(v) => v === 'webVisitors' ? 'زوار الموقع' : 'وصول التواصل'} />
              <Area type="monotone" dataKey="webVisitors" name="webVisitors" stroke="#6366f1" fill="url(#gWebVisitors)" strokeWidth={2} />
              <Area type="monotone" dataKey="socialReach" name="socialReach" stroke="#f472b6" fill="url(#gSocialReach)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Traffic Sources */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-medium text-slate-300">توزيع مصادر الزيارات</h3>
          <div className="relative mx-auto h-52 w-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={trafficSources} dataKey="value" nameKey="nameAr" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                  {trafficSources.map((s: TrafficSource) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-4">
            {trafficSources.map((s: TrafficSource) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-sm text-slate-300">{s.nameAr}</span>
                <span className="text-sm font-semibold text-slate-100">{formatNum(s.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-medium text-slate-300">ملخص سريع</h3>
          <div className="space-y-4">
            {[
              { label: 'إجمالي الزوار', value: formatNum(kpi.totalVisitors), trend: kpi.visitorsTrend },
              { label: 'وصول ميتا', value: formatNum(kpi.metaReach), trend: kpi.reachTrend },
              { label: 'معدل التفاعل', value: `${kpi.engagementRate}%`, trend: kpi.engagementTrend },
              { label: 'معدل التحويل', value: `${kpi.conversionRate}%`, trend: kpi.conversionTrend },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <span className="text-sm text-slate-300">{item.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-100">{item.value}</span>
                  <span className={`text-xs ${item.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.trend >= 0 ? '▲' : '▼'} {Math.abs(item.trend)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
