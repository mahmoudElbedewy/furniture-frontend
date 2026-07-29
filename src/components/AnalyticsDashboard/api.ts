const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const getAuthHeaders = (): Record<string, string> => {
  const accessToken = localStorage.getItem("furniture_access_token");
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 600;
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status !== undefined && RETRYABLE_STATUS_CODES.has(error.status);
  }
  return error instanceof TypeError;
}

async function withRetry<T>(attempt: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (i === MAX_RETRIES || !isRetryable(error)) throw error;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** i);
    }
  }
  throw lastError;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  try {
    const errData = await res.json();
    const msg = errData.error || errData.message || errData.detail;
    if (msg) return new ApiError(msg, res.status);
  } catch {
  }
  return new ApiError(`API error ${res.status}`, res.status);
}

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  return withRetry(async () => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/api/admin/${path}${query}`, { headers: getAuthHeaders() });
    if (!res.ok) throw await parseErrorResponse(res);
    return res.json();
  });
}

async function apiPost<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(`${API_BASE_URL}/api/admin/${path}`, {
      method: "POST", headers: getAuthHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) throw await parseErrorResponse(res);
    return res.json();
  });
}

export type DateRangeParams = { range: string; start?: string; end?: string; compareTo?: string };

function formatDateRangeParams(r: DateRangeParams): Record<string, string> {
  const p: Record<string, string> = { range: r.range };
  if (r.start) p.start = r.start;
  if (r.end) p.end = r.end;
  if (r.compareTo) p.compare_to = r.compareTo;
  return p;
}

// ─── Overview Tab ───────────────────────────────────
export type DailyTimeSeriesItem = {
  date: string;
  sessions: number;
  prevSessions: number;
  reach: number;
  prevReach: number;
  conversions: number;
  prevConversions: number;
};

export type OverviewData = {
  kpis: {
    totalReach: number; prevTotalReach?: number;
    totalEngagement: number; prevTotalEngagement?: number;
    websiteSessions: number; prevWebsiteSessions?: number; sessionsTrend: number;
    conversions: number; prevConversions?: number; conversionsTrend: number;
  };
  comparison?: { compareTo: string; prevStart: string; prevEnd: string };
  dailyTimeSeries?: DailyTimeSeriesItem[];
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
  byPostType: { type: string; reach: number; count: number; prevReach?: number }[];
  metrics?: {
    totalReach: number; prevTotalReach: number; reachTrend: number;
    totalEngagement: number; prevTotalEngagement: number; engagementTrend: number;
  };
  dailySeries?: { date: string; reach: number; prevReach: number }[];
  missingData?: { key: string; label: string; reason: string }[];
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

// ─── Web Analytics Tab ──────────────────────────────
export type TopPage = {
  name: string; page: string; views: number; uniqueVisitors: number;
  bounceRate: number; avgDuration: string;
};

export type WebAnalyticsData = {
  metrics: {
    bounceRate: number; prevBounceRate?: number; bounceRateTrend: number;
    avgSessionDuration: string; prevAvgSessionDuration?: string; avgSessionDurationTrend: number;
    totalSessions: number; prevTotalSessions?: number; totalSessionsTrend: number;
  };
  comparison?: { compareTo: string; prevStart: string; prevEnd: string };
  dailySeries?: { date: string; sessions: number; prevSessions: number; bounceRate: number; prevBounceRate: number }[];
  topPages: TopPage[];
  trafficSources?: { name: string; nameAr: string; value: number; color: string }[];
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
export const fetchOverview       = (r: DateRangeParams) => apiFetch<OverviewData>("analytics/overview/", formatDateRangeParams(r));
export const fetchAudience       = (r: DateRangeParams) => apiFetch<AudienceData>("analytics/audience/", formatDateRangeParams(r));
export const fetchContent        = (r: DateRangeParams) => apiFetch<ContentData>("analytics/content/", formatDateRangeParams(r));
export const fetchDrilldown      = (postId: string)     => apiFetch<DrilldownData>(`analytics/posts/${postId}/drilldown/`);

export const fetchMetaHub        = ()                   => apiFetch<MetaHubData>("analytics/meta/");
export const fetchWebAnalytics   = (r?: DateRangeParams) => apiFetch<WebAnalyticsData>("analytics/web/", r ? formatDateRangeParams(r) : undefined);
export const fetchAnalyticsSettings = ()                => apiFetch<AnalyticsSettings>("analytics/settings/");
export const updateAnalyticsSettings = (data: Record<string, unknown>) => apiPost<{ message: string }>("analytics/settings/", data);
export const syncNow             = ()                   => apiPost<{ message: string; results: Record<string, unknown> }>("analytics/sync-now/");
export const syncMetaData        = ()                   => apiPost<{ message: string; data?: Record<string, unknown> }>("analytics/sync-now/");
export const startMetaOAuth      = ()                   => apiFetch<{ oauth_url: string }>("analytics/meta/oauth/start/");

// ─── Product Analytics Tab ──────────────────────────
export type TopProductItem = {
  id: string;
  title: string;
  slug: string;
  category_name: string;
  primary_image: string | null;
  price: number;
  views: number;
  cart_adds: number;
  orders: number;
  revenue: number;
  conversion_rate: number;
};

export type CategoryPerformanceItem = {
  id: number;
  name: string;
  slug: string;
  products_count: number;
  views: number;
  orders: number;
  revenue: number;
};

export type UnderperformingProductItem = {
  id: string;
  title: string;
  slug: string;
  category_name: string;
  primary_image: string | null;
  price: number;
  views: number;
  orders: number;
  conversion_rate: number;
  reason: string;
};

export const fetchTopProducts          = (r?: DateRangeParams) => apiFetch<{ products: TopProductItem[] }>("analytics/products/top/", r as Record<string, string>);
export const fetchCategoryPerformance = (r?: DateRangeParams) => apiFetch<{ categories: CategoryPerformanceItem[] }>("analytics/products/categories/", r as Record<string, string>);
export const fetchUnderperformingProducts = (r?: DateRangeParams) => apiFetch<{ products: UnderperformingProductItem[] }>("analytics/products/underperforming/", r as Record<string, string>);

export type FavoriteAnalyticsItem = {
  product_id: string;
  product_title: string;
  product_slug: string;
  product_price: number;
  primary_image: string | null;
  favorites_count: number;
  converted_count: number;
  conversion_rate: number;
};

export const fetchFavoritesAnalytics = () => apiFetch<{ favorites: FavoriteAnalyticsItem[] }>("analytics/favorites/");

export type RealtimeAnalyticsData = {
  currentVisitors: number;
  source: "ga4" | "site";
  available: boolean;
  fallbackVisitors: number;
  windowMinutes: number;
  reason: string | null;
};

export type CustomerLTVItem = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  lifetimeValue: number;
  orderCount: number;
  avgOrderValue: number;
  lastOrderAt: string | null;
};

export type CustomerLTVResponse = {
  customers: CustomerLTVItem[];
  summary: {
    registeredCustomers: number;
    totalLifetimeValue: number;
    totalOrders: number;
    avgOrderValue: number;
  };
};

export const fetchRealtimeAnalytics = () => apiFetch<RealtimeAnalyticsData>("analytics/realtime/");
export const fetchCustomersLTV = () => apiFetch<CustomerLTVResponse>("analytics/customers/ltv/");

// ─── Analytics Alerts ────────────────────────────────
export type SearchAnalyticsTerm = {
  query: string;
  searchCount: number;
  totalResults: number;
  avgResults: number;
  lastSearchedAt: string | null;
};

export type SearchAnalyticsResponse = {
  topNoResults: SearchAnalyticsTerm[];
  topSuccessful: SearchAnalyticsTerm[];
  summary: {
    totalSearches: number;
    uniqueQueries: number;
    zeroResultSearches: number;
    successfulSearches: number;
    zeroResultRate: number;
  };
};

export const fetchSearchAnalytics = (r?: DateRangeParams) =>
  apiFetch<SearchAnalyticsResponse>("analytics/search/", r ? formatDateRangeParams(r) : undefined);

export type AnalyticsAlertItem = {
  id: number;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  detail: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  threshold_pct: number | null;
  actual_value: number | null;
  previous_value: number | null;
};

export type AlertsResponse = {
  alerts: AnalyticsAlertItem[];
  unread_count: number;
  total_count: number;
};

export const fetchAlerts        = (unreadOnly = false) => apiFetch<AlertsResponse>(`analytics/alerts/${unreadOnly ? '?unread_only=1' : ''}`);
export const markAlertRead      = (id: number)         => apiPost<{ ok: boolean; id: number }>(`analytics/alerts/${id}/read/`);
export const markAllAlertsRead  = ()                   => apiPost<{ ok: boolean; marked_read: number }>('analytics/alerts/read-all/');
export const triggerAlerts      = ()                   => apiPost<{ ok: boolean; fired: string[]; count: number; message: string }>('analytics/alerts/trigger/');
