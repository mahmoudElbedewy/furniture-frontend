const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const getAuthHeaders = (): Record<string, string> => {
  const accessToken = localStorage.getItem("furniture_access_token");
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/api/admin/${path}${query}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    try {
      const errData = await res.json();
      const msg = errData.error || errData.message || errData.detail;
      if (msg) throw new Error(msg);
    } catch (e: any) {
      if (e.message && !e.message.startsWith("API error ")) throw e;
    }
    throw new Error(`API error ${res.status}`);
  }
  return res.json();
}

async function apiPost<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/admin/${path}`, {
    method: "POST", headers: getAuthHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) {
    try {
      const errData = await res.json();
      const msg = errData.error || errData.message || errData.detail;
      if (msg) throw new Error(msg);
    } catch (e: any) {
      if (e.message && !e.message.startsWith("API error ")) throw e;
    }
    throw new Error(`API error ${res.status}`);
  }
  return res.json();
}

export type DateRangeParams = { range: string; start?: string; end?: string };

// ─── Overview Tab ───────────────────────────────────
export type OverviewData = {
  kpis: {
    totalReach: number; totalEngagement: number;
    websiteSessions: number; sessionsTrend: number;
    conversions: number; conversionsTrend: number;
  };
  contentToTrafficScore: number;
  alerts: { severity: "warning" | "info"; message: string }[];
  isMetaConnected: boolean;
  isGA4Connected: boolean;
  lastMetaSync: string | null;
  lastGA4Sync: string | null;
};

// ─── Audience Tab ───────────────────────────────────
export type AudienceData = {
  fbFollowers: number;
  igFollowers: number;
  sessionsBySource: { name: string; value: number }[];
  newVsReturning: { name: string; value: number }[];
  dailyUsers: { date: string; users: number }[];
};

// ─── Content Tab ────────────────────────────────────
export type FacebookPost = {
  post_id: string; message: string; image_url: string; permalink_url: string;
  utm_campaign: string; reach: number; impressions: number; likes: number;
  comments: number; shares: number; clicks: number; video_views: number;
  post_type: string; engagement_rate: number; published_at: string;
};

export type ContentData = {
  posts: FacebookPost[];
  byPostType: { type: string; reach: number; count: number }[];
};

// ─── Web Traffic Tab (old) ──────────────────────────
export type WebTrafficData = {
  metrics: { totalSessions: number; bounceRate: number; avgSessionDuration: string };
  dailyTrend: { date: string; sessions: number }[];
  topPages: { name: string; views: number; uniqueVisitors: number; bounceRate: number; avgDuration: string }[];
};

// ─── Drilldown ──────────────────────────────────────
export type DrilldownData = {
  post: FacebookPost;
  attribution: { method: "utm" | "time_window"; sessions: number; conversions: number; note: string | null };
};

// ─── Meta Hub Tab ───────────────────────────────────
export type TopPost = {
  id: string; platform: string; caption: string; imageUrl: string;
  likes: number; comments: number; shares: number; engagementRate: number; date: string;
};

export type WeeklyFollowers = { week: string; count: number };

export type FacebookData = {
  followers: number; followerGrowth: number; profileVisits: number;
  postReach: number; adSpend: number; adClicks: number;
  weeklyFollowers: WeeklyFollowers[]; pageName: string;
};

export type InstagramData = {
  followers: number; followerGrowth: number; profileVisits: number;
  reelViews: number; storyViews: number; weeklyFollowers: WeeklyFollowers[];
};

export type MetaHubData = {
  facebook: FacebookData; instagram: InstagramData;
  topPosts: TopPost[]; meta_error?: string;
};

// ─── Web Analytics Tab (new) ────────────────────────
export type TopPage = {
  name: string; page: string; views: number; uniqueVisitors: number;
  bounceRate: number; avgDuration: string;
};

export type WebAnalyticsData = {
  metrics: {
    bounceRate: number; bounceRateTrend: number;
    avgSessionDuration: string; avgSessionDurationTrend: number;
    totalSessions: number; totalSessionsTrend: number;
  };
  topPages: TopPage[];
  bounceRateSparkline: { v: number }[];
  sessionDurationSparkline: { v: number }[];
  totalSessionsSparkline: { v: number }[];
};

// ─── Settings Tab ───────────────────────────────────
export type AnalyticsSettings = {
  fb_page_url: string; fb_page_id: string; is_meta_connected: boolean; last_meta_sync: string | null;
  ga4_property_id: string; is_ga4_connected: boolean; last_ga4_sync: string | null;
  admin_name: string; admin_email: string;
  meta_access_token?: string; fb_followers_override?: number; fb_reach_override?: number;
  ig_page_url?: string; ig_followers_override?: number; is_google_connected?: boolean;
  token_status?: 'valid' | 'invalid_or_expired' | 'no_token';
  page_name?: string;
};

export type AnalyticsSettingsData = AnalyticsSettings;

// ─── API calls ──────────────────────────────────────
export const fetchOverview       = (r: DateRangeParams) => apiFetch<OverviewData>("analytics/overview/", r as Record<string, string>);
export const fetchAudience       = (r: DateRangeParams) => apiFetch<AudienceData>("analytics/audience/", r as Record<string, string>);
export const fetchContent        = (r: DateRangeParams) => apiFetch<ContentData>("analytics/content/", r as Record<string, string>);
export const fetchWebTraffic     = (r: DateRangeParams) => apiFetch<WebTrafficData>("analytics/web-traffic/", r as Record<string, string>);
export const fetchDrilldown      = (postId: string)     => apiFetch<DrilldownData>(`analytics/posts/${postId}/drilldown/`);

// These match the ACTUAL backend URLs:
export const fetchMetaHub        = ()                   => apiFetch<MetaHubData>("analytics/meta/");
export const fetchWebAnalytics   = ()                   => apiFetch<WebAnalyticsData>("analytics/web/");
export const fetchAnalyticsSettings = ()                => apiFetch<AnalyticsSettings>("analytics/settings/");
export const updateAnalyticsSettings = (data: Record<string, unknown>) => apiPost<{ message: string }>("analytics/settings/", data);
export const syncNow             = ()                   => apiPost<{ message: string; results: Record<string, unknown> }>("analytics/sync-now/");
export const syncMetaData        = ()                   => apiPost<{ message: string; data?: Record<string, unknown> }>("analytics/sync-now/");