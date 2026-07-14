import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { Users, Eye, TrendingUp, ThumbsUp, MessageSquare, Share2 } from 'lucide-react';
import { fetchMetaHub, type MetaHubData, type TopPost } from './api';

const formatNum = (n: number) => n.toLocaleString('en-US');

/* ── Platform sparkline ──────────────────────────────── */
function MiniChart({ data, color }: { data: { week: string; count: number }[]; color: string }) {
  return (
    <div className="h-12 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} />
          <Tooltip
            contentStyle={{ background: '#131824', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#94a3b8' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Social stat row ─────────────────────────────────── */
function StatRow({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-100">{typeof value === 'number' ? formatNum(value) : value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function MetaHubTab() {
  const [data, setData] = useState<MetaHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetaHub()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      <span className="mr-3 text-slate-400">جاري تحميل بيانات ميتا...</span>
    </div>
  );
  if (error) return <p className="py-12 text-center text-red-400">خطأ: {error}</p>;
  if (!data) return null;

  const { facebook: fb, instagram: ig, topPosts } = data;

  return (
    <section className="space-y-8">
      <h2 className="text-lg font-semibold text-slate-100">مركز ميتا</h2>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Facebook */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(24,119,242,0.15)' }}>
              <span className="text-xs font-bold" style={{ color: '#1877F2' }}>f</span>
            </div>
            <h3 className="text-base font-semibold text-slate-100">فيسبوك</h3>
            <span className={`mr-auto text-xs font-medium px-2 py-0.5 rounded-full ${fb.followers > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {fb.followers > 0 ? 'متصل' : 'غير متصل'}
            </span>
          </div>

          <div className="text-center py-3">
            <span className="text-3xl font-bold text-slate-100">{formatNum(fb.followers)}</span>
            <p className="text-xs text-slate-400 mt-1">متابعين</p>
            {fb.followerGrowth > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-emerald-400 mt-1">
                <TrendingUp className="h-3 w-3" /> +{fb.followerGrowth}%
              </span>
            )}
          </div>

          <MiniChart data={fb.weeklyFollowers} color="#1877F2" />

          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <StatRow icon={Eye} label="زيارات الصفحة" value={fb.profileVisits} />
            <StatRow icon={Users} label="وصول المنشورات" value={fb.postReach} />
            {fb.adSpend > 0 && <StatRow icon={TrendingUp} label="إنفاق الإعلانات" value={`${formatNum(fb.adSpend)} ج.م`} />}
            {fb.adClicks > 0 && <StatRow icon={TrendingUp} label="نقرات الإعلانات" value={fb.adClicks} />}
          </div>
        </div>

        {/* Instagram */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(253,29,29,0.15), rgba(252,176,69,0.15))' }}>
              <span className="text-xs font-bold bg-gradient-to-br from-pink-500 to-orange-400 bg-clip-text text-transparent">IG</span>
            </div>
            <h3 className="text-base font-semibold text-slate-100">إنستجرام</h3>
            <span className={`mr-auto text-xs font-medium px-2 py-0.5 rounded-full ${ig.followers > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
              {ig.followers > 0 ? 'متصل' : 'قريباً'}
            </span>
          </div>

          <div className="text-center py-3">
            <span className="text-3xl font-bold text-slate-100">{formatNum(ig.followers)}</span>
            <p className="text-xs text-slate-400 mt-1">متابعين</p>
          </div>

          <MiniChart data={ig.weeklyFollowers} color="#E1306C" />

          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <StatRow icon={Eye} label="زيارات الصفحة" value={ig.profileVisits} />
            <StatRow icon={Users} label="مشاهدات الريلز" value={ig.reelViews} />
            <StatRow icon={Eye} label="مشاهدات الستوري" value={ig.storyViews} />
          </div>

          {ig.followers === 0 && (
            <div className="mt-4 rounded-lg bg-slate-500/5 border border-slate-500/10 p-3 text-center">
              <p className="text-xs text-slate-400">صفحة الإنستجرام قيد الإنشاء — سيتم ربطها قريباً 🚀</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Posts Grid */}
      <div>
        <h3 className="mb-4 text-sm font-medium text-slate-300">أفضل المنشورات أداءً</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topPosts.map((post: TopPost) => (
            <div key={post.id} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md transition-all hover:border-white/[0.14] hover:scale-[1.02]">
              {/* Platform badge */}
              <div className="absolute top-3 left-3 z-10">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  post.platform === 'facebook'
                    ? 'bg-[#1877F2]/20 text-[#1877F2]'
                    : 'bg-gradient-to-r from-pink-500/20 to-orange-400/20 text-pink-400'
                }`}>
                  {post.platform === 'facebook' ? 'FB' : 'IG'}
                </span>
              </div>

              {/* Image */}
              <div className="h-40 overflow-hidden">
                <img
                  src={post.imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Caption */}
              <div className="p-4">
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{post.caption}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {formatNum(post.likes)}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {formatNum(post.comments)}</span>
                  <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {formatNum(post.shares)}</span>
                </div>
                {post.engagementRate > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      تفاعل {post.engagementRate}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
