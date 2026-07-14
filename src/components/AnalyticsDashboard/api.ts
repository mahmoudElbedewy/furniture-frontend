/**
 * Analytics Dashboard API Service
 * Fetches real data from Django backend endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const getAuthHeaders = (): Record<string, string> => {
  const accessToken = localStorage.getItem("furniture_access_token");
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/admin/${path}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/admin/${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────

export type TrafficSource = {
  name: string;
  nameAr: string;
  value: number;
  color: string;
};

export type KpiData = {
  totalVisitors: number;
  visitorsTrend: number;
  metaReach: number;
  reachTrend: number;
  engagementRate: number;
  engagementTrend: number;
  conversionRate: number;
  conversionTrend: number;
};

export type MonthlyTraffic = {
  month: string;
  webVisitors: number;
  socialReach: number;
  metaReach: number;
  instagramReach: number;
};

export type OverviewData = {
  kpi: KpiData;
  monthlyTraffic: MonthlyTraffic[];
  trafficSources: TrafficSource[];
};

export type WebMetrics = {
  bounceRate: number;
  bounceRateTrend: number;
  avgSessionDuration: string;
  avgSessionDurationTrend: number;
  totalSessions: number;
  totalSessionsTrend: number;
};

export type TopPage = {
  name: string;
  page: string;
  views: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgDuration: string;
};

export type WebAnalyticsData = {
  metrics: WebMetrics;
  topPages: TopPage[];
  bounceRateSparkline: { v: number }[];
  sessionDurationSparkline: { v: number }[];
  totalSessionsSparkline: { v: number }[];
};

export type WeeklyFollowers = { week: string; count: number };

export type FacebookData = {
  followers: number;
  followerGrowth: number;
  profileVisits: number;
  postReach: number;
  adSpend: number;
  adClicks: number;
  weeklyFollowers: WeeklyFollowers[];
};

export type InstagramData = {
  followers: number;
  followerGrowth: number;
  profileVisits: number;
  reelViews: number;
  storyViews: number;
  weeklyFollowers: WeeklyFollowers[];
};

export type TopPost = {
  id: string;
  platform: "facebook" | "instagram";
  caption: string;
  imageUrl: string;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  date: string;
};

export type MetaHubData = {
  facebook: FacebookData;
  instagram: InstagramData;
  topPosts: TopPost[];
};

export type AnalyticsSettingsData = {
  fb_page_url: string;
  fb_page_id: string;
  fb_followers_override: number;
  fb_reach_override: number;
  ig_page_url: string;
  ig_followers_override: number;
  is_meta_connected: boolean;
  is_google_connected: boolean;
  admin_name: string;
  admin_email: string;
};

// ─── API Fetchers ─────────────────────────────────────

export const fetchOverview = () => apiFetch<OverviewData>("analytics/overview/");
export const fetchWebAnalytics = () => apiFetch<WebAnalyticsData>("analytics/web/");
export const fetchMetaHub = () => apiFetch<MetaHubData>("analytics/meta/");
export const fetchAnalyticsSettings = () => apiFetch<AnalyticsSettingsData>("analytics/settings/");
export const updateAnalyticsSettings = (data: Record<string, unknown>) =>
  apiPost<{ message: string }>("analytics/settings/update/", data);
