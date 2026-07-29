import { useEffect, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { Eye, Heart, ArrowUpRight, ArrowDownRight, GitCompare } from 'lucide-react';
import { fetchContent, type ContentData, type FacebookPost } from './api';
import type { DateRangeState } from './useDateRange';
import PostDrilldownModal from './PostDrilldownModal';
import { ContentSkeleton } from './Skeletons';

/* ── Visual Metric Card for Content ── */
function VisualContentCard({
  icon: Icon,
  label,
  value,
  prevValue,
  trend,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  prevValue?: number;
  trend: number;
  color: string;
}) {
  const isPositive = trend >= 0;
  const cur = value || 0;
  const prv = prevValue || 0;
  const maxVal = Math.max(cur, prv, 1);
  const curPct = Math.min(100, Math.round((cur / maxVal) * 100));
  const prvPct = Math.min(100, Math.round((prv / maxVal) * 100));

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
        {cur.toLocaleString()}
      </p>

      {/* Visual comparison bar */}
      <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>الفترة الحالية</span>
            <span className="font-semibold text-slate-200">{cur.toLocaleString()}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${curPct}%`, background: color }} />
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

export default function ContentTab({ dateRange }: { dateRange: DateRangeState }) {
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<FacebookPost | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchContent(dateRange).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [dateRange]);

  if (loading) return <ContentSkeleton />;
  if (error) return <p className="py-12 text-center text-red-400">Error: {error}</p>;
  if (!data) return null;

  if (!data.posts || data.posts.length === 0) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-8 backdrop-blur-md text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <span className="text-3xl">📭</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-100">لا توجد منشورات متزامنة</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            هذا التبويب يعرض بيانات المنشورات الحقيقية من صفحة فيسبوك بعد المزامنة.
            لعرض البيانات يجب:
          </p>
          <ol className="text-sm text-slate-400 list-decimal list-inside space-y-1.5 max-w-md mx-auto text-right">
            <li>التأكد من إدخال <strong className="text-slate-200">Access Token</strong> صالح في الإعدادات</li>
            <li>التأكد من إدخال <strong className="text-slate-200">Page ID</strong> الصحيح</li>
            <li>الضغط على <strong className="text-slate-200">مزامنة الآن</strong> في صفحة الإعدادات</li>
          </ol>
          <div className="mx-auto grid max-w-lg gap-2 text-right sm:grid-cols-3">
            {[
              'افتح Settings وأكمل بيانات Meta',
              'شغل المزامنة وانتظر انتهاءها',
              'ارجع هنا وغيّر الفترة إذا لزم',
            ].map((step, index) => (
              <div key={step} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs text-slate-300">
                <span className="mb-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/10 text-amber-200">{index + 1}</span>
                <p className="m-0 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          {data.missingData && data.missingData.length > 0 && (
            <div className="mt-4 rounded-lg bg-white/[0.04] border border-white/[0.08] p-3">
              {data.missingData.map((m: { key: string; label: string; reason: string }) => (
                <p key={m.key} className="text-xs text-slate-500">{m.reason}</p>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  const metrics = data.metrics;
  const dailySeries = data.dailySeries || [];

  return (
    <section className="space-y-8">
      {/* Metric Cards if available */}
      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2">
          <VisualContentCard
            icon={Eye}
            label="وصول المنشورات (Total Reach)"
            value={metrics.totalReach}
            prevValue={metrics.prevTotalReach}
            trend={metrics.reachTrend}
            color="#6366f1"
          />
          <VisualContentCard
            icon={Heart}
            label="التفاعل الإجمالي (Total Engagement)"
            value={metrics.totalEngagement}
            prevValue={metrics.prevTotalEngagement}
            trend={metrics.engagementTrend}
            color="#f472b6"
          />
        </div>
      )}

      {/* ── Time-Series Line/Area Chart ── */}
      {dailySeries.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300">مقارنة الوصول اليومي للمحتوى (Daily Reach Comparison)</h3>
            <span className="text-xs text-slate-400 bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
              <GitCompare size={12} className="text-amber-400" /> مقارنة الفترات
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="contentReachCur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="contentReachPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="reach" name="الوصول (الفترة الحالية)" stroke="#6366f1" strokeWidth={2} fill="url(#contentReachCur)" />
                <Area type="monotone" dataKey="prevReach" name="الوصول (فترة المقارنة)" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#contentReachPrev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bar Chart comparing reach by post type */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
        <h3 className="mb-4 text-sm font-medium text-slate-300">الوصول حسب نوع المنشور (Reach by Post Type)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byPostType}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="reach" name="الفترة الحالية" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="prevReach" name="فترة المقارنة" fill="#475569" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
        <h3 className="mb-4 text-sm font-medium text-slate-300">Posts — click a row for traffic attribution</h3>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-left text-xs text-slate-400">
                <th className="pb-3">Post</th><th className="pb-3">Type</th><th className="pb-3">Reach</th>
                <th className="pb-3">Engagement</th><th className="pb-3">Rate</th><th className="pb-3">Published</th>
              </tr>
            </thead>
            <tbody>
              {data.posts.map((post) => (
                <tr key={post.post_id}
                  className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.06]"
                  onClick={() => setSelectedPost(post)}>
                  <td className="py-3 pr-3 text-slate-200 max-w-[280px] truncate">{post.message || '(no caption)'}</td>
                  <td className="py-3 pr-3 text-slate-300">{post.post_type}</td>
                  <td className="py-3 pr-3 text-slate-300">{post.reach.toLocaleString()}</td>
                  <td className="py-3 pr-3 text-slate-300">{post.likes + post.comments + post.shares}</td>
                  <td className="py-3 pr-3 text-emerald-400">{post.engagement_rate}%</td>
                  <td className="py-3 pr-3 text-slate-400">{post.published_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPost && (
        <PostDrilldownModal postId={selectedPost.post_id} onClose={() => setSelectedPost(null)} />
      )}
    </section>
  );
}
