/* ── Basic pulsing block — building unit for every skeleton below ─── */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

/* ── Overview Tab ─────────────────────────────────────────────────── */
export function OverviewSkeleton() {
  return (
    <section className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
            <SkeletonBlock className="h-4 w-24 mb-4" />
            <SkeletonBlock className="h-7 w-20 mb-2" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center space-y-3">
        <SkeletonBlock className="h-3 w-40 mx-auto" />
        <SkeletonBlock className="h-10 w-24 mx-auto" />
        <SkeletonBlock className="h-3 w-56 mx-auto" />
      </div>
    </section>
  );
}

/* ── Meta Hub Tab ─────────────────────────────────────────────────── */
export function MetaHubSkeleton() {
  return (
    <section className="space-y-8">
      <SkeletonBlock className="h-5 w-32" />
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-8 w-8 rounded-lg" />
              <SkeletonBlock className="h-4 w-24" />
            </div>
            <SkeletonBlock className="h-10 w-28 mx-auto" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      <div>
        <SkeletonBlock className="h-4 w-40 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] overflow-hidden">
              <SkeletonBlock className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Content Tab ──────────────────────────────────────────────────── */
export function ContentSkeleton() {
  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <SkeletonBlock className="h-4 w-32 mb-4" />
        <SkeletonBlock className="h-64 w-full" />
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-3">
        <SkeletonBlock className="h-4 w-48 mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </div>
    </section>
  );
}

/* ── Web Analytics Tab ────────────────────────────────────────────── */
export function WebAnalyticsSkeleton() {
  return (
    <section className="space-y-8">
      <SkeletonBlock className="h-5 w-36" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-3">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-24" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <SkeletonBlock className="h-4 w-32 mb-4" />
          <SkeletonBlock className="h-64 w-64 rounded-full mx-auto" />
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <SkeletonBlock className="h-4 w-40 mb-4" />
          <SkeletonBlock className="h-72 w-full" />
        </div>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-3">
        <SkeletonBlock className="h-4 w-40 mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </div>
    </section>
  );
}

/* ── Settings Tab ─────────────────────────────────────────────────── */
export function SettingsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-7 w-48" />
        <SkeletonBlock className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-12 w-12 rounded-xl" />
              <SkeletonBlock className="h-4 w-32" />
            </div>
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <SkeletonBlock className="h-5 w-40 mb-4" />
        <SkeletonBlock className="h-16 w-full" />
      </div>
    </div>
  );
}