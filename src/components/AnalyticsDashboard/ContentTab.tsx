import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { fetchContent, type ContentData, type FacebookPost } from './api';
import type { DateRangeState } from './useDateRange';
import PostDrilldownModal from './PostDrilldownModal';

export default function ContentTab({ dateRange }: { dateRange: DateRangeState }) {
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<FacebookPost | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchContent(dateRange).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [dateRange]);

  if (loading) return <div className="py-20 text-center text-slate-400">Loading content…</div>;
  if (error) return <p className="py-12 text-center text-red-400">Error: {error}</p>;
  if (!data) return null;

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
        <h3 className="mb-4 text-sm font-medium text-slate-300">Reach by post type</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byPostType}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="reach" fill="#6366f1" radius={[6, 6, 0, 0]} />
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