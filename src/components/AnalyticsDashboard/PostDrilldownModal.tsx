import { useEffect, useState } from 'react';
import { X, ThumbsUp, MessageSquare, Share2, Users, Target } from 'lucide-react';
import { fetchDrilldown, type DrilldownData } from './api';

export default function PostDrilldownModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [data, setData] = useState<DrilldownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDrilldown(postId).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [postId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#131824] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Post drill-down</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
        </div>

        {loading && <p className="text-slate-400 text-sm py-8 text-center">Loading…</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {data && (
          <>
            {data.post.image_url && (
              <img src={data.post.image_url} alt="" className="w-full h-40 object-cover rounded-lg mb-4" />
            )}
            <p className="text-sm text-slate-300 mb-4 line-clamp-3">{data.post.message}</p>

            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="rounded-lg bg-white/[0.04] p-3">
                <ThumbsUp className="mx-auto h-4 w-4 text-slate-400 mb-1" />
                <p className="text-sm font-semibold text-slate-100">{data.post.likes}</p>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-3">
                <MessageSquare className="mx-auto h-4 w-4 text-slate-400 mb-1" />
                <p className="text-sm font-semibold text-slate-100">{data.post.comments}</p>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-3">
                <Share2 className="mx-auto h-4 w-4 text-slate-400 mb-1" />
                <p className="text-sm font-semibold text-slate-100">{data.post.shares}</p>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
              <p className="text-xs font-medium text-indigo-300 mb-3">Attributed website traffic</p>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <Users className="mx-auto h-4 w-4 text-slate-400 mb-1" />
                  <p className="text-lg font-bold text-slate-100">{data.attribution.sessions}</p>
                  <p className="text-[11px] text-slate-500">sessions</p>
                </div>
                <div className="text-center">
                  <Target className="mx-auto h-4 w-4 text-slate-400 mb-1" />
                  <p className="text-lg font-bold text-slate-100">{data.attribution.conversions}</p>
                  <p className="text-[11px] text-slate-500">conversions</p>
                </div>
              </div>
              {data.attribution.note && (
                <p className="mt-3 text-[11px] text-amber-400/80">{data.attribution.note}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}