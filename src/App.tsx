import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  BarChart,
  CheckCircle2,
  Heart,
  Home,
  ImageUp,
  Paperclip,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  PackageSearch,
  Phone,
  Power,
  Search,
  Send,
  Settings,
  Share2,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./App.css";
import AnalyticsDashboard from "./components/AnalyticsDashboard/AnalyticsDashboard";
import {
  FURNITURE_IDENTITY_READY_EVENT,
} from "./contexts/cartStore";
import { useCart } from "./contexts/useCart";
import {
  WishlistProvider,
} from "./contexts/WishlistContext";
import type { FavoriteProduct } from "./contexts/wishlistStore";
import type { CartItem, Product, ProductVariant } from "./types/storefront";
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}
type Category = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
};

type PaginatedProducts = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
};
type OrderItemPayload = {
  product_id: string;
  quantity: number;
  shipping_price?: number;
  shipping_location?: string;
  variant_id?: string | null;
};

type OrderPayload = {
  customer_name: string;
  customer_phone: string;
  customer_governorate: string;
  customer_address: string;
  notes?: string;
  shipping_price?: number;
  items: OrderItemPayload[];
};

type Order = Omit<OrderPayload, "items"> & {
  id?: string;
  order_number?: string;
  status?: string;
  shipping_price?: string;
  total_price?: string;
  created_at?: string;
  items?: {
    product_id: string;
    product_title: string;
    quantity: number;
    price_at_order_time?: string;
  }[];
};

type CustomerProfile = {
  id: string;
  email: string;
  full_name?: string;
  phone_number?: string;
  role?: string;
};

type AdminOrder = Order & {
  commission?: {
    id: string;
    amount: string | number;
    is_settled: boolean;
    settled_at?: string | null;
  } | null;
};

type Commission = {
  id: string;
  order: string;
  amount: string | number;
  is_settled: boolean;
  settled_at?: string | null;
};

type ProductDraftResponse = {
  message: string;
  draft: Record<string, unknown>;
  action_id?: string | null;
  source_image_urls: string[];
  product_image_urls: string[];
};

type ChatContext = {
  current_page: string;
  page_type:
    | "catalog"
    | "product"
    | "category"
    | "cart"
    | "wishlist"
    | "checkout"
    | "orders"
    | "track"
    | "about"
    | "auth"
    | "admin"
    | "other";
  product_id?: string;
  product_slug?: string;
  product_name?: string;
  category_name?: string;
  recent_navigation?: BrowsingEvent[];
};

type BrowsingEvent = Omit<ChatContext, "recent_navigation"> & {
  visited_at?: string;
};

type ChatSession = {
  conversationId: string;
  identityToken: string;
};

const NAVIGATION_HISTORY_KEY = "furniture_chat_navigation_history";

function pageTypeFromPath(path: string): ChatContext["page_type"] {
  if (path.startsWith("/product/")) return "product";
  if (path.startsWith("/category/")) return "category";
  if (path === "/" || path === "/products") return "catalog";
  if (path.startsWith("/cart")) return "cart";
  if (path.startsWith("/wishlist")) return "wishlist";
  if (path.startsWith("/checkout")) return "checkout";
  if (path.startsWith("/orders")) return "orders";
  if (path.startsWith("/track")) return "track";
  if (path.startsWith("/about")) return "about";
  if (path.startsWith("/login") || path.startsWith("/register")) return "auth";
  if (path.startsWith("/admin")) return "admin";
  return "other";
}

function readNavigationHistory(): BrowsingEvent[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(NAVIGATION_HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.current_page).slice(-12) : [];
  } catch {
    return [];
  }
}

type ChatMessage = {
  id: string | number;
  sender?: "customer" | "agent" | "admin" | "system";
  sender_type?: "customer" | "agent" | "admin";
  content: string;
  timestamp?: string;
  cardEndpoint?: string;
  attachments?: ChatAttachment[];
};

type ChatAttachment = { id: string | number; image?: string; image_url?: string };

type ChatProductCard = {
  id: string;
  title: string;
  final_price: number;
  slug: string;
  image_url?: string;
  requires_deposit?: boolean;
  deposit_amount?: number | null;
};

type ChatConversation = {
  id: string;
  customer_identifier: string;
  customer_name?: string | null;
  status: "open" | "needs_admin" | "closed";
  is_agent_active: boolean;
  created_at: string;
  last_message_at: string;
  messages: ChatMessage[];
};

type Toast = {
  tone: "success" | "error" | "info";
  text: string;
};

type AgentSettingsState = {
  id?: number;
  is_globally_active: boolean;
  auto_reply_mode: "full_auto" | "suggest_only" | "off";
  updated_at?: string;
};

type DashboardStats = {
  total_orders: number;
  total_revenue: string | number;
  pending_commissions: string | number;
  received_commissions: string | number;
  our_payments: string | number;
  net_profit: string | number;
  active_products: number;
};

type StorePayment = {
  id: string | number;
  amount: string | number;
  payment_type: "ads" | "shipping" | "tools" | "other";
  description: string;
  paid_at: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const CATALOG_PAGE_SIZE = 16;
const WHATSAPP_BUSINESS_NUMBER = "201503466584";
const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ??
  (import.meta.env.DEV
    ? "ws://127.0.0.1:8000"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`);

const heroImage =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=85";

const normalizePath = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, "") : path;

const readPathSegment = (path: string, prefix: string) => {
  const cleanPath = normalizePath(path);
  if (!cleanPath.startsWith(prefix)) return null;
  const segment = cleanPath.slice(prefix.length).split("/")[0];
  return segment ? decodeURIComponent(segment) : null;
};

const productSlugFromPath = (path: string) =>
  readPathSegment(path, "/product/") ?? readPathSegment(path, "/products/");

const categorySlugFromPath = (path: string) =>
  readPathSegment(path, "/category/");

const routeHashFromPath = (path: string) => {
  const cleanPath = normalizePath(path);
  if (cleanPath === "/" || cleanPath === "/products" || cleanPath.startsWith("/category/")) {
    return "#catalog";
  }
  if (cleanPath.startsWith("/product/") || productSlugFromPath(cleanPath)) {
    return "#details";
  }
  if (cleanPath === "/checkout") return "#checkout";
  if (cleanPath === "/orders") return "#orders";
  if (cleanPath === "/track") return "#track";
  if (cleanPath === "/login") return "#login";
  if (cleanPath === "/register") return "#register";
  if (cleanPath === "/logout") return "#logout";
  if (cleanPath === "/admin" || cleanPath.startsWith("/admin-panel")) return "#admin";
  if (cleanPath === "/analytics") return "#analytics";
  if (cleanPath === "/cart" || cleanPath === "/wishlist" || cleanPath === "/about") return "#catalog";
  return "#notfound";
};

const pathFromHash = (hash: string, product?: Product | null) => {
  switch (hash) {
    case "#details":
      return product?.slug ? `/product/${encodeURIComponent(product.slug)}` : "/products";
    case "#checkout":
      return "/checkout";
    case "#orders":
      return "/orders";
    case "#track":
      return "/track";
    case "#login":
      return "/login";
    case "#register":
      return "/register";
    case "#logout":
      return "/logout";
    case "#admin":
      return "/admin";
    case "#analytics":
      return "/analytics";
    case "#catalog":
    default:
      return "/products";
  }
};

const money = (value?: string | number | null) => {
  const numeric = Number(value ?? 0);
  const formatted = Number.isFinite(numeric)
    ? new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }).format(numeric)
    : "0";
  return `${formatted} ج.م`;
};

const getAuthHeaders = (): Record<string, string> => {
  const accessToken = localStorage.getItem("furniture_access_token");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};
const itemUnitPrice = (item: CartItem) =>
  item.selectedVariant ? Number(item.selectedVariant.price) : Number(item.product.final_price);

const cartItemKey = (product: Product, variant?: ProductVariant | null) =>
  variant ? `${product.id}::${variant.id}` : product.id;

const pickDefaultVariant = (product?: Product | null): ProductVariant | null =>
  product?.variants && product.variants.length > 0 ? product.variants[0] : null;
const getImageUrl = (images: unknown) => {
  if (typeof images === "string" && images.startsWith("http")) return images;

  if (Array.isArray(images)) {
    const first = images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const candidate = first as {
        image_url?: string;
        image?: string;
        url?: string;
      };
      return candidate.image_url ?? candidate.image ?? candidate.url;
    }
  }

  if (images && typeof images === "object") {
    const candidate = images as {
      image_url?: string;
      image?: string;
      url?: string;
    };
    return candidate.image_url ?? candidate.image ?? candidate.url;
  }

  return null;
};

const resolveAssetUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

const productPageUrl = (product: Pick<Product, "slug">) =>
  new URL(`/product/${encodeURIComponent(product.slug)}`, window.location.origin).toString();

const openProductWhatsapp = (product: Pick<Product, "title" | "final_price" | "slug">) => {
  const message = [
    "مرحباً، أريد الاستفسار عن المنتج التالي:",
    `المنتج: ${product.title}`,
    `السعر: ${money(product.final_price)}`,
    `رابط المنتج المباشر: ${productPageUrl(product)}`,
  ].join("\n\n");
  window.open(
    `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  );
};

const SITE_ORIGIN = "https://homestyle-store.vercel.app";
const DEFAULT_META_DESCRIPTION =
  "Home Style: contemporary furniture in Egypt. Discover sofas, bedrooms, dining rooms, and home furniture.";

const normalizeMetaDescription = (value?: string | null) => {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return DEFAULT_META_DESCRIPTION;
  return normalized.length <= 160
    ? normalized
    : `${normalized.slice(0, 157).trimEnd()}...`;
};

function RouteMeta({
  pathname,
  product,
}: {
  pathname: string;
  product: Product | null;
}) {
  const normalizedPath = normalizePath(pathname);
  const categorySlug = categorySlugFromPath(normalizedPath);
  const isProductPage = Boolean(productSlugFromPath(normalizedPath));
  const noIndexPaths = new Set([
    "/cart",
    "/checkout",
    "/wishlist",
    "/orders",
    "/track",
    "/login",
    "/register",
    "/logout",
    "/admin",
    "/analytics",
  ]);
  const isNoIndex =
    noIndexPaths.has(normalizedPath) ||
    normalizedPath.startsWith("/admin-panel");

  let title = "Home Style | Furniture in Egypt";
  let description = DEFAULT_META_DESCRIPTION;
  let image = heroImage;

  if (isProductPage && product) {
    title = `${product.title} | Home Style`;
    description = normalizeMetaDescription(
      `${product.title}. ${product.description ?? ""}`,
    );
    image = resolveAssetUrl(getImageUrl(product.images)) ?? heroImage;
  } else if (normalizedPath === "/products" || normalizedPath === "/") {
    title = "Home Style";
    description =
      "Explore Home Style collections in Egypt: sofas, bedrooms, dining rooms, and modern home furniture.";
  } else if (categorySlug) {
    const categoryTitle = categorySlug.replaceAll("-", " ");
    title = `${categoryTitle} Furniture | Home Style`;
    description = `Explore ${categoryTitle} furniture from Home Style in Egypt.`;
  } else if (normalizedPath === "/about") {
    title = "About Home Style";
    description =
      "Learn about Home Style and browse furniture selected for modern homes in Egypt.";
  }

  const canonical = `${SITE_ORIGIN}${normalizedPath === "/" ? "/" : normalizedPath}`;
  const productSchema =
    isProductPage && product
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: normalizeMetaDescription(product.description),
          image: [image],
          sku: product.id,
          category: product.category_name,
          offers: {
            "@type": "Offer",
            priceCurrency: "EGP",
            price: Number(product.final_price),
            availability: product.is_available === false
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
            url: canonical,
          },
        }
      : null;

  return (
    <Helmet>
      <html lang="ar" dir="rtl" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={isNoIndex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content={productSchema ? "product" : "website"} />
      <meta property="og:site_name" content="Home Style" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {productSchema && (
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
      )}
    </Helmet>
  );
}

const safeJson = async (response: Response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const TOOL_LEAK_PATTERNS = [
  /<function[^>]*>/gi,
  /<\/function>/gi,
  /\b(search_products|get_shipping_options|check_deposit_requirements|create_order_from_chat|get_product_details|show_product_cards|list_catalog_products)\b/gi,
  /(هستخدم|هجيب|هشوف|أنا هتستخدم|هستدعي)\s+(أداة|tool|function)/gi,
];

const stripToolLeaks = (text: string): string => {
  let cleaned = text;
  for (const pattern of TOOL_LEAK_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
};

type AgentCardAction = {
  action: "render_product_cards";
  api_endpoint: string;
  products_count?: number;
};

const extractAgentAction = (
  value: string,
): { action: AgentCardAction | null; text: string } => {
  const jsonMatch = value.match(
    /\{[\s\S]*"action"\s*:\s*"render_product_cards"[\s\S]*\}/,
  );
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(
        jsonMatch[0].replaceAll("'", '"'),
      ) as Record<string, unknown>;
      if (
        parsed.action === "render_product_cards" &&
        typeof parsed.api_endpoint === "string"
      ) {
        return {
          action: parsed as AgentCardAction,
          text: value.replace(jsonMatch[0], "").trim(),
        };
      }
    } catch {
      // ignore malformed card payload
    }
  }

  const action = parseAgentAction(value);
  return { action, text: action ? "" : value };
};

const parseAgentAction = (value: string): AgentCardAction | null => {
  try {
    const parsed = JSON.parse(value.replaceAll("'", '"')) as Record<string, unknown>;
    if (parsed.action === "render_product_cards" && typeof parsed.api_endpoint === "string") {
      return parsed as AgentCardAction;
    }
  } catch {
    // not JSON action payload
  }
  return null;
};

const cleanMessageContent = (value: unknown): string => {
  if (typeof value === "string") {
    const action = parseAgentAction(value);
    if (action) return "";

    try {
      const parsed = JSON.parse(value.replaceAll("'", '"'));
      return cleanMessageContent(parsed);
    } catch {
      return stripToolLeaks(value);
    }
  }

  if (Array.isArray(value)) {
    return value.map(cleanMessageContent).filter(Boolean).join("\n");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.content === "string") return record.content;
    if (typeof record.message === "string") return record.message;
    return Object.entries(record)
      .filter(
        ([key]) =>
          ![
            "type",
            "extras",
            "additional_kwargs",
            "response_metadata",
          ].includes(key),
      )
      .map(([, item]) => cleanMessageContent(item))
      .filter(Boolean)
      .join("\n");
  }

  return value == null ? "" : String(value);
};

const draftRows = [
  ["title", "Product name"],
  ["category_name", "Category"],
  ["supplier_name", "Supplier"],
  ["material", "Material"],
  ["color", "Color"],
  ["dimensions", "Dimensions"],
  ["base_price", "Base price"],
  ["commission_value", "Commission"],
  ["variants", "Sizes/Variants"], 
  ["requires_deposit", "Requires deposit"],
  ["deposit_amount", "Deposit amount"],
  ["ships_nationwide", "Shipping coverage"],
  ["default_shipping_price", "Default shipping"],
  ["description", "Description"],
] as const;

const formatDraftValue = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === "") return "Missing";
  if (typeof value === "boolean") {
    if (key === "ships_nationwide")
      return value ? "All governorates" : "Cairo and Giza only";
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value))
    return value.length ? `${value.length} item(s)` : "None";
  return String(value);
};

const isDraftReady = (draft: Record<string, unknown> | null) =>
  Boolean(draft?.ready_for_approval) &&
  Array.isArray(draft?.missing_fields) &&
  draft.missing_fields.length === 0;

const getMessageSender = (message: ChatMessage) =>
  message.sender ?? message.sender_type ?? "agent";

const normalizeMessage = (message: ChatMessage): ChatMessage => {
  const raw = message.content;
  if (typeof raw === "string") {
    const { action, text } = extractAgentAction(raw);
    return {
      ...message,
      sender: getMessageSender(message),
      content: stripToolLeaks(text || cleanMessageContent(raw)),
      cardEndpoint: action?.api_endpoint,
    };
  }

  return {
    ...message,
    sender: getMessageSender(message),
    content: cleanMessageContent(raw),
  };
};

const normalizeConversation = (
  conversation: ChatConversation,
): ChatConversation => ({
  ...conversation,
  messages: (conversation.messages ?? []).map(normalizeMessage),
});

let refreshPromise: Promise<string | null> | null = null;
let identityPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("furniture_refresh_token");
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) throw new Error("refresh failed");

    const data = await response.json();
    localStorage.setItem("furniture_access_token", data.access);
    if (data.refresh) {
      localStorage.setItem("furniture_refresh_token", data.refresh);
    }
    return data.access as string;
  } catch {
    localStorage.removeItem("furniture_access_token");
    localStorage.removeItem("furniture_refresh_token");
    return null;
  }
}

function getRefreshedToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
const getStoredIdentityToken = () =>
  localStorage.getItem("furniture_identity_token");

const setStoredIdentity = (identifier: string, identityToken: string) => {
  localStorage.setItem("furniture_identifier", identifier);
  localStorage.setItem("furniture_identity_token", identityToken);
  window.dispatchEvent(
    new CustomEvent(FURNITURE_IDENTITY_READY_EVENT, { detail: identityToken }),
  );
};

async function request<T>(path: string, init: RequestInit = {}, isRetry = false) {
  const headers = new Headers(init.headers);
  if (init.body instanceof FormData) headers.delete("Content-Type");
  else headers.set("Content-Type", "application/json");
  const authHeaders = getAuthHeaders();

  const requiresAuth =
    path.startsWith("/api/admin/") ||
    path.startsWith("/api/auth/me/") ||
    path.startsWith("/api/auth/logout/") ||
    path.startsWith("/api/orders/mine/");

  const requestBody = typeof init.body === "string" ? init.body : "";
  const hasGuestIdentityToken =
    path.includes("identity_token=") ||
    /"identity_token"\s*:\s*"[^"]+"/.test(requestBody) ||
    (init.body instanceof FormData &&
      typeof init.body.get("identity_token") === "string" &&
      Boolean(init.body.get("identity_token")));
  const shouldSendOptionalAuth =
    Boolean(authHeaders.Authorization) &&
    !hasGuestIdentityToken &&
    (path === "/api/orders/" ||
      path.startsWith("/api/chat/") ||
      path.startsWith("/api/catalog/favorites/"));

  if (requiresAuth || shouldSendOptionalAuth) {
    Object.entries(authHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && (requiresAuth || shouldSendOptionalAuth) && !isRetry) {
    const newAccessToken = await getRefreshedToken();
    if (newAccessToken) {
      return request<T>(path, init, true);
    }
  }

  if (!response.ok) {
    const payload = await safeJson(response).catch(() => null);
    let detail = payload?.detail ?? payload?.message ?? response.statusText;

    if (payload && typeof payload === 'object') {
      const errors = Object.values(payload).flat();
      if (errors.length > 0 && typeof errors[0] === 'string') {
        detail = errors[0];
      }
    }

    if (requiresAuth && response.status === 401) {
      localStorage.removeItem("furniture_access_token");
      localStorage.removeItem("furniture_refresh_token");
    }

    throw new Error(detail);
  }

  return safeJson(response) as Promise<T>;
}

const api = {
  async listCategories() {
    return request<Category[]>("/api/catalog/categories/");
  },
  async listProducts(params: URLSearchParams) {
    const query = params.toString();
    return request<PaginatedProducts | Product[]>(
      `/api/catalog/products/${query ? `?${query}` : ""}`,
    );
  },
  async getProduct(slug: string) {
    return request<Product>(`/api/catalog/products/${slug}/`);
  },
  async startChat({
    product,
    context,
    identityToken,
    forceNew = false,
  }: {
    product?: Product;
    context: ChatContext;
    identityToken?: string;
    forceNew?: boolean;
  }): Promise<ChatSession> {
    const resolvedIdentityToken = identityToken ?? await this.ensureIdentity();

    const payload = await request<
      Record<string, string> & {
        id?: string;
        conversation_id?: string;
        identity_token?: string;
        customer_identifier?: string;
      }
    >("/api/chat/start/", {
      method: "POST",
      body: JSON.stringify({
        identity_token: resolvedIdentityToken,
        customer_name:
          localStorage.getItem("furniture_customer_name") ?? "Guest Customer",
        product_id: product?.id,
        force_new: forceNew,
        context,
      }),
    });

    if (payload?.identity_token) {
      setStoredIdentity(payload.customer_identifier ?? "", payload.identity_token);
    }

    const conversationId = payload?.id ?? payload?.conversation_id;
    if (!conversationId)
      throw new Error("Chat start response did not include a conversation id.");
    return {
      conversationId,
      identityToken: payload?.identity_token ?? resolvedIdentityToken,
    };
  },
  async sendChatMessage(
    conversationId: string,
    payload: { message: string; sender_type: "customer"; context: ChatContext },
    images: File[] = [],
    identityToken = "",
  ) {
    const form = new FormData();
    form.append("message", payload.message);
    form.append("sender_type", payload.sender_type);
    form.append("context", JSON.stringify(payload.context));
    if (identityToken) form.append("identity_token", identityToken);
    images.forEach((image) => form.append("images", image));
    return request<{ messages: ChatMessage[]; agent_error?: string }>(
      `/api/chat/${conversationId}/send/`,
      {
        method: "POST",
        body: form,
      },
    );
  },
  async getChatHistory(conversationId: string, identityToken = "") {
    const query = identityToken
      ? `?identity_token=${encodeURIComponent(identityToken)}`
      : "";
    const payload = await request<{ conversation_status: string; messages: ChatMessage[] }>(
      `/api/chat/${conversationId}/history/${query}`,
    );
    return { ...payload, messages: payload.messages.map(normalizeMessage) };
  },
  async updateChatContext(
    conversationId: string,
    context: ChatContext,
    identityToken = "",
  ) {
    return request(`/api/chat/${conversationId}/context/`, {
      method: "POST",
      body: JSON.stringify({ context, identity_token: identityToken }),
    });
  },
  async fetchProductCards(endpoint: string) {
    return request<{ products: ChatProductCard[] }>(endpoint);
  },
  async createOrder(payload: OrderPayload, depositProofImage?: File | null) {
    if (depositProofImage) {
      const form = new FormData();
      form.append("customer_name", payload.customer_name);
      form.append("customer_phone", payload.customer_phone);
      form.append("customer_governorate", payload.customer_governorate);
      form.append("customer_address", payload.customer_address);
      form.append("notes", payload.notes ?? "");
      form.append("shipping_price", String(payload.shipping_price ?? 0));
      form.append("items", JSON.stringify(payload.items));
      form.append("deposit_proof_image", depositProofImage);

      const response = await fetch(`${API_BASE_URL}/api/orders/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: form,
      });
      if (!response.ok) {
        const errBody = await safeJson(response).catch(() => null);
        throw new Error(`${response.status} ${errBody?.detail ?? JSON.stringify(errBody) ?? response.statusText}`);
      }
      return safeJson(response) as Promise<Order>;
    }

    return request<Order>("/api/orders/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async trackOrder(orderNumber: string) {
    return request<Order>(
      `/api/orders/track/${encodeURIComponent(orderNumber)}/`,
    );
  },
  async listMyOrders() {
    return request<Order[]>("/api/orders/mine/");
  },
  async getCurrentUser() {
    return request<CustomerProfile>("/api/auth/me/");
  },
  async saveAbandonedCart(customerPhone: string, items: CartItem[]) {
    return Promise.all(
      items.map(({ product }) =>
        request("/api/orders/abandoned/", {
          method: "POST",
          body: JSON.stringify({
            phone_number: customerPhone,
            product_id: product.id,
          }),
        }),
      ),
    );
  },

  async login(email: string, password: string) {
    return request<{ access: string; refresh: string }>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async register(payload: {
    email: string;
    password: string;
    full_name: string;
    phone_number: string;
  }) {
    return request<CustomerProfile>("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async ensureIdentity() {
    if (!identityPromise) {
      identityPromise = (async () => {
        const existingToken = getStoredIdentityToken();
        const payload = await request<{
          identifier: string;
          identity_token: string;
        }>("/api/auth/identity/", {
          method: "POST",
          body: JSON.stringify(
            existingToken ? { identity_token: existingToken } : {},
          ),
        });
        setStoredIdentity(payload.identifier, payload.identity_token);
        return payload.identity_token;
      })().finally(() => {
        identityPromise = null;
      });
    }
    return identityPromise;
  },
  async getAgentSettings() {
    return request<AgentSettingsState>("/api/admin/agent-settings/");
  },
  async updateAgentSettings(payload: Partial<AgentSettingsState>) {
    return request<AgentSettingsState>("/api/admin/agent-settings/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  async getDashboardStats() {
    return request<DashboardStats>("/api/admin/dashboard/stats/");
  },
  async listAdminOrders(params: URLSearchParams) {
    const query = params.toString();
    const payload = await request<AdminOrder[] | { results: AdminOrder[] }>(
      `/api/admin/orders/${query ? `?${query}` : ""}`,
    );
    return Array.isArray(payload) ? payload : payload.results;
  },
  async updateAdminOrderStatus(orderId: string, nextStatus: string) {
    return request<AdminOrder>(`/api/admin/orders/${orderId}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
  },
  async listCommissions(params: URLSearchParams) {
    const query = params.toString();
    const payload = await request<Commission[] | { results: Commission[] }>(
      `/api/admin/commissions/${query ? `?${query}` : ""}`,
    );
    return Array.isArray(payload) ? payload : payload.results;
  },
  async settleCommission(commissionId: string) {
    return request<Commission>(
      `/api/admin/commissions/${commissionId}/settle/`,
      {
        method: "PATCH",
      },
    );
  },
  async listAdminChats() {
    const conversations =
      await request<ChatConversation[]>("/api/admin/chats/");
    return conversations.map(normalizeConversation);
  },
  async adminReply(conversationId: string, content: string, images: File[] = []) {
    const form = new FormData();
    form.append("content", content);
    images.forEach((image) => form.append("images", image));
    const message = await request<ChatMessage>(
      `/api/admin/chats/${conversationId}/reply/`,
      {
        method: "POST",
        body: form,
      },
    );
    return normalizeMessage(message);
  },
  async listPayments() {
    const payload = await request<StorePayment[] | { results: StorePayment[] }>("/api/admin/payments/");
    return Array.isArray(payload) ? payload : payload.results;
  },
  async createPayment(payload: Omit<StorePayment, "id">) {
    return request<StorePayment>("/api/admin/payments/", { method: "POST", body: JSON.stringify(payload) });
  },
  async markAdminChatRead(conversationId: string) {
    return request(`/api/admin/chats/${conversationId}/mark_read/`, { method: "PATCH", body: JSON.stringify({}) });
  },
  async getCustomerUnread(identityToken = "") {
    const query = identityToken
      ? `?identity_token=${encodeURIComponent(identityToken)}`
      : "";
    return request<{ unread_count: number }>(`/api/chat/unread/${query}`);
  },
  async getPushConfig() {
    return request<{ vapid_public_key: string }>("/api/chat/push-config/");
  },
  async savePushSubscription(subscription: PushSubscriptionJSON) {
    return request("/api/chat/push-subscriptions/", { method: "POST", body: JSON.stringify(subscription) });
  },
  async toggleFavorite(productId: string, identityToken: string) {
    const payload = identityToken
      ? { product_id: productId, identity_token: identityToken }
      : { product_id: productId };
    return request<
      | { message?: string }
      | {
          id: string;
          product: string;
          customer_identifier: string;
          created_at: string;
        }
    >("/api/catalog/favorites/toggle/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async checkFavorite(productId: string, identityToken: string) {
    const query = new URLSearchParams({ product_id: productId });
    if (identityToken) query.set("identity_token", identityToken);
    return request<{ is_favorited: boolean }>(
      `/api/catalog/favorites/check/?${query.toString()}`,
    );
  },
  async listFavorites(identityToken: string) {
    const query = identityToken
      ? `?identity_token=${encodeURIComponent(identityToken)}`
      : "";
    return request<
      Array<{
        id: string;
        product: string;
        product_title: string;
        product_slug: string;
        product_final_price: string;
        customer_identifier: string;
        created_at: string;
      }>
    >(`/api/catalog/favorites/${query}`);
  },
  async uploadAgentImages(files: FileList) {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("images", file));
    const response = await fetch(
      `${API_BASE_URL}/api/admin/agent/product-images/`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: form,
      },
    );

    if (!response.ok) {
      const payload = await safeJson(response).catch(() => null);
      throw new Error(
        `${response.status} ${payload?.detail ?? payload?.message ?? response.statusText}`,
      );
    }

    return safeJson(response) as Promise<{ message: string }>;
  },
  async createProductDraft(form: FormData) {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/agent/product-draft/`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: form,
      },
    );

    if (!response.ok) {
      const payload = await safeJson(response).catch(() => null);
      throw new Error(
        `${response.status} ${payload?.detail ?? payload?.message ?? response.statusText}`,
      );
    }

    return safeJson(response) as Promise<ProductDraftResponse>;
  },
};
// Track page visits
const trackVisit = (path: string) => {
  try {
    fetch('/api/track-visit/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, referrer: document.referrer }),
    }).catch(() => {}); // silent fail
  } catch {} // silent fail
};

const trackFunnelEvent = (eventType: string, productId?: string) => {
  try {
    fetch('/api/track-funnel-event/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, product_id: productId }),
    }).catch(() => {});
  } catch {}
};

const vapidKeyToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(base64);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const hash = routeHashFromPath(location.pathname);
  const routeProductSlug = productSlugFromPath(location.pathname);
  const routeCategorySlug = categorySlugFromPath(location.pathname);
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [depositFilter, setDepositFilter] = useState("");
  const [shippingFilter, setShippingFilter] = useState("");
  const [minPriceFilter, setMinPriceFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInputOpen, setSearchInputOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const { cart, setCart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [orderResult, setOrderResult] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatConnected, setChatConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [depositProofFile, setDepositProofFile] = useState<File | null>(null);
  const [depositProofPreview, setDepositProofPreview] = useState<string | null>(null);
  const [depositSentViaWhatsapp, setDepositSentViaWhatsapp] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [pendingOrderPayload, setPendingOrderPayload] = useState<OrderPayload | null>(null);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [pendingVariant, setPendingVariant] = useState<ProductVariant | null>(null);
  const [detailSelectedVariant, setDetailSelectedVariant] = useState<ProductVariant | null>(null);


  const [chatProductCards, setChatProductCards] = useState<
    Record<string, ChatProductCard[]>
  >({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "agent",
      content:
        "أهلاً بيك.\nأنا كريم من Home Style.\nقولي محتاج إيه — منتج، شحن، أو أوردر.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [chatImages, setChatImages] = useState<File[]>([]);
  const [chatImagePreviews, setChatImagePreviews] = useState<string[]>([]);
  const [customerUnreadCount, setCustomerUnreadCount] = useState(0);
  const [savedScrollPos, setSavedScrollPos] = useState(0);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [customerProfileReady, setCustomerProfileReady] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [activeAdminTab, setActiveAdminTab] = useState("dashboard");
  const [agentSettings, setAgentSettings] = useState<AgentSettingsState | null>(
    null,
  );
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null,
  );
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [selectedAdminOrderId, setSelectedAdminOrderId] = useState<
    string | null
  >(null);
  const [adminOrderStatusFilter, setAdminOrderStatusFilter] = useState("");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionFilter, setCommissionFilter] = useState("false");
  const [payments, setPayments] = useState<StorePayment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState<StorePayment["payment_type"]>("ads");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [adminChats, setAdminChats] = useState<ChatConversation[]>([]);
  const [selectedAdminChatId, setSelectedAdminChatId] = useState<string | null>(
    null,
  );
  const [adminReplyDraft, setAdminReplyDraft] = useState("");
  const [adminReplyImages, setAdminReplyImages] = useState<File[]>([]);
  const [adminReplyPreviews, setAdminReplyPreviews] = useState<string[]>([]);
  const [agentUploadLoading, setAgentUploadLoading] = useState(false);
  const [adminAgentLoading, setAdminAgentLoading] = useState(false);
  const [adminAgentDraft, setAdminAgentDraft] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoriteClicks, setFavoriteClicks] = useState<Record<string, number>>({});
  const [favoritesDropdownOpen, setFavoritesDropdownOpen] = useState(false);
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);
  const [favoriteProductDetails, setFavoriteProductDetails] = useState<Record<string, Product>>({});
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [adminAgentMessages, setAdminAgentMessages] = useState<ChatMessage[]>([
    {
      id: "admin-agent-welcome",
      sender: "agent",
      content:
        "Send product/order requirements as text or screenshots, then attach the final product images separately.",
    },
  ]);
  const socketRef = useRef<WebSocket | null>(null);
  const chatImageInputRef = useRef<HTMLInputElement | null>(null);
  const adminReplyImageInputRef = useRef<HTMLInputElement | null>(null);
  const categoriesRef = useRef<Category[]>([]);
  const productsRef = useRef<Product[]>([]);
  const favoriteDetailsFetchedRef = useRef<Set<string>>(new Set());
  const navigationHistoryRef = useRef<BrowsingEvent[]>(readNavigationHistory());

  const isAnalyticsRoute = hash === "#analytics";
  const isAdminRoute =
    hash === "#admin" || location.pathname.startsWith("/admin-panel");
  const isAuthRoute =
    hash === "#login" || hash === "#register" || hash === "#logout";
  const hasAuthToken = Boolean(localStorage.getItem("furniture_access_token"));
  const hasAdminToken = hasAuthToken && customerProfile?.role === "admin";
  const setHash = useCallback(
    (nextHash: string) => {
      navigate(pathFromHash(nextHash, activeProduct));
    },
    [activeProduct, navigate],
  );

  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    navigate(pathFromHash(location.hash, activeProduct), { replace: true });
  }, [activeProduct, location.hash, navigate]);

  useEffect(() => {
    if (!routeCategorySlug) return;
    setSelectedCategory((current) =>
      current === routeCategorySlug ? current : routeCategorySlug,
    );
  }, [routeCategorySlug]);

  useEffect(() => {
    if (location.pathname === "/cart") {
      setCartOpen(true);
    } else if (location.pathname === "/wishlist") {
      setFavoritesDropdownOpen(true);
    } else if (location.pathname === "/about") {
      setAboutModalOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}`;
    if (typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: pagePath,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
    trackVisit(pagePath);
  }, [location.pathname, location.search]);

  // Clear search when navigating away from catalog
  useEffect(() => {
    if (hash !== "#catalog") {
      setSearchQuery("");
    }
  }, [hash]);

  // Close the mobile nav dropdown whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [hash]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCategory,
    materialFilter,
    depositFilter,
    shippingFilter,
    minPriceFilter,
    maxPriceFilter,
    searchQuery,
  ]);

  // Debounce search query - only when on catalog page and search query changes
  useEffect(() => {
    if (hash !== "#catalog" || !searchQuery.trim()) return;

    const handler = setTimeout(() => {
      loadProducts();
    }, 2000);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, hash]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setApiError("");

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: String(CATALOG_PAGE_SIZE),
      });
      if (selectedCategory) params.set("category", selectedCategory);
      if (materialFilter.trim()) params.set("material", materialFilter.trim());
      if (depositFilter) params.set("has_deposit", depositFilter);
      if (shippingFilter)
        params.set(
          "ships_nationwide",
          shippingFilter === "all_governorates" ? "true" : "false",
        );
      if (minPriceFilter.trim()) params.set("min_price", minPriceFilter.trim());
      if (maxPriceFilter.trim()) params.set("max_price", maxPriceFilter.trim());
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const categoryRequest = categoriesRef.current.length
        ? Promise.resolve(categoriesRef.current)
        : api.listCategories().catch(() => []);
      const [categoryPayload, productPayload] = await Promise.all([
        categoryRequest,
        api.listProducts(params),
      ]);

      let productResults: Product[] = [];
      if (Array.isArray(productPayload)) {
        productResults = productPayload;
        setTotalPages(1);
        setTotalProducts(productPayload.length);
      } else {
        productResults = productPayload.results || [];
        setTotalPages(
          Math.ceil((productPayload.count || 0) / CATALOG_PAGE_SIZE) || 1,
        );
        setTotalProducts(productPayload.count || 0);
      }

      categoriesRef.current = categoryPayload;
      setCategories(categoryPayload);
      setProducts(productResults);
      setActiveProduct((current) =>
        routeProductSlug ? current : current ?? productResults[0] ?? null,
      );
    } catch (error) {
      setProducts([]);
      setActiveProduct(null);
      setApiError(
        error instanceof Error
          ? error.message
          : "حدث خطأ في الاتصال",
      );
    } finally {
      setLoading(false);
    }
  }, [
    depositFilter,
    materialFilter,
    maxPriceFilter,
    minPriceFilter,
    selectedCategory,
    shippingFilter,
    searchQuery,
    currentPage,
    routeProductSlug,
  ]);

  const loadCustomerProfile = useCallback(async () => {
    if (!localStorage.getItem("furniture_access_token")) {
      setCustomerProfile(null);
      setCustomerProfileReady(true);
      return;
    }

    try {
      const profile = await api.getCurrentUser();
      setCustomerProfile(profile);
      if (profile.full_name)
        localStorage.setItem("furniture_customer_name", profile.full_name);
      if (profile.phone_number)
        localStorage.setItem("furniture_customer_phone", profile.phone_number);
      if (profile.email) {
        const emailKey = profile.email.split("@")[0].toLowerCase();
        localStorage.setItem("furniture_customer_email_key", emailKey);
      }
    } catch {
      setCustomerProfile(null);
    } finally {
      setCustomerProfileReady(true);
    }
  }, []);

  useEffect(() => {
    loadCustomerProfile();
  }, [loadCustomerProfile]);

  const getCustomerIdentifier = useCallback(async () => {
    if (customerProfile) return "";
    const existing = localStorage.getItem("furniture_identity_token");
    if (existing) return existing;
    try {
      return await api.ensureIdentity();
    } catch {
      return "";
    }
  }, [customerProfile]);

  const getChatIdentityToken = useCallback(async () => {
    return customerProfile ? "" : getCustomerIdentifier();
  }, [customerProfile, getCustomerIdentifier]);

  const loadFavorites = useCallback(async () => {
    if (!customerProfileReady) return;
    const isAuthenticated = Boolean(customerProfile);
    const customerIdentifier = isAuthenticated ? "" : await getCustomerIdentifier();
    if (!isAuthenticated && !customerIdentifier) return;

    try {
      setFavoritesLoading(true);
      const favoritesData = await api.listFavorites(customerIdentifier);
      const favoriteIds = new Set(favoritesData.map((f) => f.product));
      setFavorites(favoriteIds);
      setFavoriteProducts(favoritesData);

      // The favorites endpoint doesn't return an image, and the favorited
      // product might not be in the currently loaded/filtered products page.
      // Fetch full product data for those so the favorites list always has
      // an image, regardless of which category/page/filter is active.
      const missing = favoritesData.filter(
        (fav) =>
          !productsRef.current.some((p) => p.id === fav.product) &&
          !favoriteDetailsFetchedRef.current.has(fav.product),
      );
      if (missing.length > 0) {
        missing.forEach((fav) => favoriteDetailsFetchedRef.current.add(fav.product));
        Promise.all(
          missing.map((fav) => api.getProduct(fav.product_slug).catch(() => null)),
        ).then((results) => {
          setFavoriteProductDetails((prev) => {
            const next = { ...prev };
            results.forEach((product, idx) => {
              if (product) next[missing[idx].product] = product;
            });
            return next;
          });
        });
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setFavoritesLoading(false);
    }
  }, [customerProfile, customerProfileReady, getCustomerIdentifier]);

  const toggleFavorite = useCallback(async (productId: string) => {
    const isAuthenticated = Boolean(customerProfile);
    const customerIdentifier = isAuthenticated ? "" : await getCustomerIdentifier();
    if (!isAuthenticated && !customerIdentifier) return;

    const lastClick = favoriteClicks[productId] || 0;
    const now = Date.now();
    if (now - lastClick < 2000) {
      return;
    }

    setFavoriteClicks((prev) => ({ ...prev, [productId]: now }));

    try {
      await api.toggleFavorite(productId, customerIdentifier);
      setFavorites((current) => {
        const newFavorites = new Set(current);
        if (newFavorites.has(productId)) {
          newFavorites.delete(productId);
        } else {
          newFavorites.add(productId);
        }
        return newFavorites;
      });
      await loadFavorites();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  }, [customerProfile, getCustomerIdentifier, favoriteClicks, loadFavorites]);

  useEffect(() => {
    if (hash === "#catalog") {
      loadProducts();
    }
  }, [hash, loadProducts]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!conversationId) return;

    const accessToken = customerProfile
      ? localStorage.getItem("furniture_access_token")
      : null;
    const wsUrl = accessToken 
      ? `${WS_BASE_URL}/ws/chat/${conversationId}/?token=${accessToken}`
      : `${WS_BASE_URL}/ws/chat/${conversationId}/`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    setChatConnected(false);
    socket.onopen = () => {
      setChatConnected(true);
      setChatError("");
    };
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const content = payload.message ?? payload.content;
        const attachments = payload.attachments ?? [];
        if (!content && attachments.length === 0) return;

        const normalized = normalizeMessage({
          id: payload.id ?? crypto.randomUUID(),
          sender: payload.sender_type ?? "agent",
          content: content ?? "",
          attachments,
        });

        setMessages((current) => [...current, normalized]);
      } catch {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            sender: "agent",
            content: stripToolLeaks(event.data),
          },
        ]);
      }
    };
    socket.onerror = () => {
      setChatConnected(false);
      setChatError(
        "WebSocket connection failed. Run the backend with Daphne on port 8000.",
      );
    };
    socket.onclose = () => setChatConnected(false);

    return () => {
      setChatConnected(false);
      socket.close();
    };
  }, [conversationId, customerProfile]);

  useEffect(() => {
    if (!chatOpen || !conversationId) return;

    const refreshHistory = async () => {
      try {
        const identityToken = await getChatIdentityToken();
        const history = await api.getChatHistory(conversationId, identityToken);
        setMessages((current) => {
          const currentKey = current.map((message) => message.id).join("|");
          const nextKey = history.messages
            .map((message) => message.id)
            .join("|");
          return currentKey === nextKey ? current : history.messages;
        });
      } catch {
        // Keep the chat usable even if a history refresh fails.
      }
    };

    refreshHistory();
    const timer = window.setInterval(refreshHistory, 3500);
    return () => window.clearInterval(timer);
  }, [chatOpen, conversationId, getChatIdentityToken]);

  useEffect(() => {
    messages.forEach((message) => {
      const key = String(message.id);
      if (!message.cardEndpoint || chatProductCards[key]) return;

      api
        .fetchProductCards(message.cardEndpoint)
        .then((data) => {
          setChatProductCards((current) => ({
            ...current,
            [key]: data.products ?? [],
          }));
        })
        .catch(() => {
          // ignore card fetch errors in chat UI
        });
    });
  }, [messages, chatProductCards]);

  const loadAdminData = useCallback(async () => {
    setAdminLoading(true);
    setAdminError("");

    try {
      const [settingsPayload, statsPayload] = await Promise.all([
        api.getAgentSettings(),
        api.getDashboardStats().catch(() => null),
      ]);
      const orderParams = new URLSearchParams();
      if (adminOrderStatusFilter)
        orderParams.set("status", adminOrderStatusFilter);
      const commissionParams = new URLSearchParams();
      if (commissionFilter) commissionParams.set("settled", commissionFilter);
      const chatsPayload = await api.listAdminChats().catch(() => []);
      const ordersPayload = await api
        .listAdminOrders(orderParams)
        .catch(() => []);
      const commissionsPayload = await api
        .listCommissions(commissionParams)
        .catch(() => []);
      const paymentsPayload = await api.listPayments().catch(() => []);
      setAgentSettings(settingsPayload);
      setDashboardStats(statsPayload);
      setAdminChats(chatsPayload);
      setAdminOrders(ordersPayload);
      setCommissions(commissionsPayload);
      setPayments(paymentsPayload);
      setSelectedAdminChatId(
        (current) => current ?? chatsPayload[0]?.id ?? null,
      );
      setSelectedAdminOrderId(
        (current) => current ?? ordersPayload[0]?.id ?? null,
      );
    } catch (error) {
      setAdminError(
        error instanceof Error
          ? error.message
          : "Could not load admin dashboard.",
      );
    } finally {
      setAdminLoading(false);
    }
  }, [adminOrderStatusFilter, commissionFilter]);

  useEffect(() => {
    if (hasAdminToken || chatOpen || !customerProfileReady) return;
    let cancelled = false;
    const refresh = async () => {
      const identityToken = customerProfile ? "" : await getCustomerIdentifier();
      if (!customerProfile && !identityToken) return;

      try {
        const data = await api.getCustomerUnread(identityToken);
        if (!cancelled) setCustomerUnreadCount(data.unread_count ?? 0);
      } catch {
        // A failed background badge refresh should not affect the storefront.
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    chatOpen,
    customerProfile,
    customerProfileReady,
    getCustomerIdentifier,
    hasAdminToken,
  ]);

  useEffect(() => {
    if (isAdminRoute && hasAdminToken) {
      loadAdminData();
    }
  }, [hasAdminToken, isAdminRoute, loadAdminData]);

  const loadMyOrders = useCallback(async () => {
    if (!hasAuthToken) {
      setMyOrders([]);
      setOrdersError(
        "Login first so we can show orders linked to your account.",
      );
      return;
    }

    setOrdersLoading(true);
    setOrdersError("");

    try {
      setMyOrders(await api.listMyOrders());
    } catch (error) {
      setMyOrders([]);
      if (error instanceof Error && error.message.includes("404")) {
        setOrdersError(
          "Orders endpoint is not active yet. Restart the Django backend so /api/orders/mine/ is available.",
        );
      } else {
        setOrdersError(
          error instanceof Error
            ? error.message
            : "Could not load your orders.",
        );
      }
    } finally {
      setOrdersLoading(false);
    }
  }, [hasAuthToken]);

  useEffect(() => {
    if (hash === "#orders" && !isAdminRoute) {
      loadMyOrders();
    }
  }, [hash, isAdminRoute, loadMyOrders]);

const mainTab = useMemo<
  "catalog" | "details" | "checkout" | "orders" | "track" | "notfound"
>(() => {
  const clean = hash.replace("#", "");
  if (
    clean === "details" ||
    clean === "checkout" ||
    clean === "orders" ||
    clean === "track"
  ) {
    return clean;
  }
  if (clean === "" || clean === "catalog") {
    return "catalog";
  }
  const knownElsewhere = ["login", "register", "logout", "admin", "analytics"];
  if (knownElsewhere.includes(clean)) {
    return "catalog";
  }
  return "notfound";
}, [hash]);
  useEffect(() => {
  if (mainTab !== "notfound") return;
  const timer = window.setTimeout(() => {
    navigate("/products");
  }, 4000);
  return () => window.clearTimeout(timer);
}, [mainTab, navigate]);

  useEffect(() => {
    if (mainTab !== "details" || !routeProductSlug) return;

    let cancelled = false;

    const loadProductFromRoute = async () => {
      setDetailsLoading(true);
      setDetailsError("");
      try {
        const product = await api.getProduct(routeProductSlug);
        if (cancelled) return;
        setActiveProduct(product);
        setActiveImageIndex(0);
        setDetailSelectedVariant(pickDefaultVariant(product));
        trackFunnelEvent("product_view", product.id);
      } catch (error) {
        if (cancelled) return;
        setActiveProduct(null);
        setDetailsError(
          error instanceof Error
            ? error.message
            : "Could not load product details.",
        );
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    };

    loadProductFromRoute();
    return () => {
      cancelled = true;
    };
  }, [mainTab, routeProductSlug]);

  const chatContext = useMemo<ChatContext>(() => {
    const currentPage = `${location.pathname}${location.search}`;
    const context: ChatContext = {
      current_page: currentPage,
      page_type: pageTypeFromPath(location.pathname),
    };
    if (mainTab === "details" && activeProduct) {
      context.product_id = activeProduct.id;
      context.product_slug = activeProduct.slug;
      context.product_name = activeProduct.title;
      context.category_name = activeProduct.category_name;
    }
    return context;
  }, [activeProduct, location.pathname, location.search, mainTab]);

  const recordNavigation = useCallback((context: ChatContext) => {
    const { recent_navigation: _recentNavigation, ...event } = context;
    const nextEvent: BrowsingEvent = {
      ...event,
      visited_at: new Date().toISOString(),
    };
    const current = navigationHistoryRef.current;
    const last = current.at(-1);
    const samePage =
      last?.current_page === nextEvent.current_page &&
      last?.page_type === nextEvent.page_type;
    const nextHistory = samePage
      ? [...current.slice(0, -1), { ...last, ...nextEvent }]
      : [...current, nextEvent];
    navigationHistoryRef.current = nextHistory.slice(-12);
    sessionStorage.setItem(
      NAVIGATION_HISTORY_KEY,
      JSON.stringify(navigationHistoryRef.current),
    );
    return navigationHistoryRef.current;
  }, []);

  const withNavigationHistory = useCallback((context: ChatContext): ChatContext => ({
    ...context,
    recent_navigation: navigationHistoryRef.current,
  }), []);

  useEffect(() => {
    const history = recordNavigation(chatContext);
    if (!conversationId) return;

    let cancelled = false;
    void (async () => {
      const identityToken = await getChatIdentityToken();
      if (cancelled) return;
      await api.updateChatContext(conversationId, {
        ...chatContext,
        recent_navigation: history,
      }, identityToken).catch(() => undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [chatContext, conversationId, getChatIdentityToken, recordNavigation]);

  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!activeProduct) {
      setRelatedProducts([]);
      return;
    }

    let cancelled = false;

    const loadRelatedProducts = async () => {
      const localFallback = () =>
        products
          .filter(
            (item) =>
              item.id !== activeProduct.id &&
              item.category_name === activeProduct.category_name,
          )

      try {
        const categorySlug = categories.find(
          (category) => category.name === activeProduct.category_name,
        )?.slug;

        const params = new URLSearchParams({ page: "1" });
        if (categorySlug) {
          params.set("category", categorySlug);
        } else {
          params.set("search", activeProduct.category_name);
        }

        const payload = await api.listProducts(params);
        const list = Array.isArray(payload) ? payload : payload.results;
        const filtered = list
          .filter(
            (item) =>
              item.id !== activeProduct.id &&
              item.category_name === activeProduct.category_name,
          )

        if (!cancelled) {
          setRelatedProducts(filtered.length > 0 ? filtered : localFallback());
        }
      } catch {
        if (!cancelled) setRelatedProducts(localFallback());
      }
    };

    loadRelatedProducts();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProduct, categories]);

  const subtotal = cart.reduce(
    (total, item) => total + itemUnitPrice(item) * item.quantity,
    0,
  );

  const totalShipping = cart.reduce(
    (total, item) => total + (item.shippingPrice || 0) * item.quantity,
    0,
  );

  const grandTotal = subtotal + totalShipping;
  const DEPOSIT_PHONE_DISPLAY = "+20 15 0346 6584";
  const DEPOSIT_PHONE_WA = "201503466584";

  const totalDeposit = cart.reduce(
    (total, item) =>
      total +
      (item.product.requires_deposit && item.product.deposit_amount
        ? Number(item.product.deposit_amount) * item.quantity
        : 0),
    0,
  );

  const copyDepositPhone = async () => {
    try {
      await navigator.clipboard.writeText(DEPOSIT_PHONE_DISPLAY);
      setToast({ tone: "success", text: "تم نسخ الرقم." });
    } catch {
      setToast({ tone: "error", text: "تعذر نسخ الرقم." });
    }
  };

  const sendDepositViaWhatsapp = () => {
    const message = `مرحباً، أريد إرسال إيصال تحويل الديبوزيت بقيمة ${money(totalDeposit)} لطلبي.`;
    window.open(`https://wa.me/${DEPOSIT_PHONE_WA}?text=${encodeURIComponent(message)}`, "_blank");
    setDepositSentViaWhatsapp(true);
    setDepositProofFile(null);
    setDepositProofPreview(null);
  };

  const handleDepositFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setDepositProofFile(file);
    setDepositSentViaWhatsapp(false);
    setDepositProofPreview(file ? URL.createObjectURL(file) : null);
  };

const openProductDetails = async (product: Product) => {
  setSavedScrollPos(window.scrollY);
  setActiveProduct(product);
  setActiveImageIndex(0);
  setDetailSelectedVariant(pickDefaultVariant(product)); 
  setDetailsError("");
  navigate(`/product/${encodeURIComponent(product.slug)}`);
  window.setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 0);
};

const closeProductDetails = () => {
  navigate("/products");
  setActiveProduct(null);
  setDetailSelectedVariant(null); 
  window.setTimeout(() => {
    window.scrollTo({ top: savedScrollPos, behavior: "instant" });
  }, 0);
};
  const addToCart = (product: Product) => {
  if (product.variants && product.variants.length > 0) {
    setActiveProduct(product);
    setSizeModalOpen(true);
    return;
  }
  proceedAddToCart(product, null);
};

const proceedAddToCart = (product: Product, variant: ProductVariant | null) => {
  const hasShippingOptions = product.shipping_rates && product.shipping_rates.length > 0;
  if (hasShippingOptions) {
    setActiveProduct(product);
    setPendingVariant(variant);
    setLocationModalOpen(true);
    return;
  }
  const defaultShipping = product.default_shipping_price ? Number(product.default_shipping_price) : 0;
  addItemToCart(product, variant, null, defaultShipping);
};

const selectProductSize = (product: Product, variant: ProductVariant) => {
  setSizeModalOpen(false);
  proceedAddToCart(product, variant);
};
const openCheckout = () => {
  trackFunnelEvent('checkout_start');
  navigate("/checkout");
  setCheckoutOpen(true);
};

const addItemToCart = (
  product: Product,
  variant: ProductVariant | null,
  location: string | null,
  shippingPrice: number,
) => {
    trackFunnelEvent('add_to_cart', product.id);
  const key = cartItemKey(product, variant);
  setCart((current) => {
    const existing = current.find((item) => cartItemKey(item.product, item.selectedVariant) === key);
    if (existing) {
      return current.map((item) =>
        cartItemKey(item.product, item.selectedVariant) === key
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    }
    return [
      ...current,
      { product, quantity: 1, selectedVariant: variant, selectedLocation: location, shippingPrice },
    ];
  });
  setCartOpen(true);
  const sizeLabel = variant ? ` (${variant.size_name})` : "";
  setToast({ tone: "success", text: `${product.title}${sizeLabel} أضيف للسلة.` });
};

  const selectShippingLocation = (product: Product, location: string, price: number) => {
  addItemToCart(product, pendingVariant, location, price);
  setPendingVariant(null);
  setLocationModalOpen(false);
  setCartOpen(true);
};

  const updateQuantity = (product: Product, variant: ProductVariant | null | undefined, quantity: number) => {
  const key = cartItemKey(product, variant ?? null);
  setCart((current) =>
    current
      .map((item) =>
        cartItemKey(item.product, item.selectedVariant) === key ? { ...item, quantity } : item,
      )
      .filter((item) => item.quantity > 0),
  );
};

  const enablePushNotifications = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission === "denied") return;
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") return;
    const [registration, config] = await Promise.all([
      navigator.serviceWorker.register("/chat-sw.js"),
      api.getPushConfig(),
    ]);
    if (!config.vapid_public_key) return;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyToUint8Array(config.vapid_public_key),
    });
    await api.savePushSubscription(subscription.toJSON());
  };

  const openContextChat = async (product?: Product) => {
    const contextProduct = product ?? (
      mainTab === "details" ? activeProduct ?? undefined : undefined
    );
    if (contextProduct) setActiveProduct(contextProduct);
    setChatOpen(true);
    setChatError("");
    void enablePushNotifications().catch(() => undefined);

    try {
      const identityToken = await getChatIdentityToken();
      const context = withNavigationHistory({
        ...chatContext,
        ...(contextProduct
          ? {
              product_id: contextProduct.id,
              product_slug: contextProduct.slug,
              product_name: contextProduct.title,
              category_name: contextProduct.category_name,
            }
          : {}),
      });
      const session = await api.startChat({
        product: contextProduct,
        context,
        identityToken,
      });
      if (conversationId && conversationId !== session.conversationId) {
        socketRef.current?.close();
      }
      setConversationId(session.conversationId);
      const history = await api.getChatHistory(
        session.conversationId,
        session.identityToken,
      );
      if (history.messages.length) {
        setMessages(history.messages);
      }
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Could not start chat.",
      );
    }
  };

  const selectChatImages = (files: File[]) => {
    chatImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setChatImages(files);
    setChatImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const removeChatImage = (index: number) => {
    URL.revokeObjectURL(chatImagePreviews[index]);
    setChatImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setChatImagePreviews((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const selectAdminReplyImages = (files: File[]) => {
    adminReplyPreviews.forEach((url) => URL.revokeObjectURL(url));
    setAdminReplyImages(files);
    setAdminReplyPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const removeAdminReplyImage = (index: number) => {
    URL.revokeObjectURL(adminReplyPreviews[index]);
    setAdminReplyImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setAdminReplyPreviews((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message && chatImages.length === 0) return;

    const payload = {
      message,
      sender_type: "customer",
      context: withNavigationHistory(chatContext),
    } as const;

    try {
      let activeConversationId = conversationId;
      let identityToken = await getChatIdentityToken();

      if (!activeConversationId) {
        const session = await api.startChat({
          product: mainTab === "details" ? activeProduct ?? undefined : undefined,
          context: payload.context,
          identityToken,
        });
        activeConversationId = session.conversationId;
        identityToken = session.identityToken;
        setConversationId(session.conversationId);
      }

      if (socketRef.current?.readyState === WebSocket.OPEN && chatImages.length === 0) {
        socketRef.current.send(
  JSON.stringify({
    ...payload,
    ...(identityToken ? { identity_token: identityToken } : {}),
  }),
);
      } else {
        const response = await api.sendChatMessage(
          activeConversationId,
          payload,
          chatImages,
          identityToken,
        );
        setMessages((current) => [
          ...current,
          ...response.messages.map(normalizeMessage),
        ]);
        if (response.agent_error) {
          setChatError(
            `Agent could not reply automatically: ${response.agent_error}`,
          );
        } else {
          setChatError("");
        }
      }

      setDraft("");
      setChatImages([]);
      chatImagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setChatImagePreviews([]);
      if (chatImageInputRef.current) chatImageInputRef.current.value = "";
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Message was not sent.",
      );
    }
  };

  const selectedAdminChat =
    adminChats.find((chat) => chat.id === selectedAdminChatId) ?? null;
  const selectedAdminOrder =
    adminOrders.find((order) => order.id === selectedAdminOrderId) ?? null;

  const getChatLastMessage = (chat: ChatConversation) => chat.messages.at(-1);

  const getReadMap = () => {
    try {
      return JSON.parse(
        localStorage.getItem("furniture_admin_chat_reads") ?? "{}",
      ) as Record<string, string>;
    } catch {
      return {};
    }
  };

  const markChatRead = (chat: ChatConversation) => {
    const readMap = getReadMap();
    readMap[chat.id] = chat.last_message_at;
    localStorage.setItem("furniture_admin_chat_reads", JSON.stringify(readMap));
    api.markAdminChatRead(chat.id).catch(() => undefined);
  };

  const isUnreadChat = (chat: ChatConversation) => {
    const lastMessage = getChatLastMessage(chat);
    if (!lastMessage || getMessageSender(lastMessage) !== "customer")
      return false;
    return getReadMap()[chat.id] !== chat.last_message_at;
  };

  const selectAdminChat = (chat: ChatConversation) => {
    setSelectedAdminChatId(chat.id);
    markChatRead(chat);
  };

  const sendAdminReply = async (event: FormEvent) => {
    event.preventDefault();
    const content = adminReplyDraft.trim();
    if (!selectedAdminChat || (!content && adminReplyImages.length === 0)) return;

    try {
      const reply = await api.adminReply(selectedAdminChat.id, content, adminReplyImages);
      setAdminChats((current) =>
        current.map((chat) =>
          chat.id === selectedAdminChat.id
            ? {
                ...chat,
                messages: [...chat.messages, reply],
                last_message_at: reply.timestamp ?? chat.last_message_at,
              }
            : chat,
        ),
      );
      setAdminReplyDraft("");
      setAdminReplyImages([]);
      adminReplyPreviews.forEach((url) => URL.revokeObjectURL(url));
      setAdminReplyPreviews([]);
      if (adminReplyImageInputRef.current) adminReplyImageInputRef.current.value = "";
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : "Could not send admin reply.",
      );
    }
  };

  const addPayment = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    try {
      await api.createPayment({ amount, payment_type: paymentType, description: paymentDescription, paid_at: paymentDate });
      setPaymentAmount("");
      setPaymentDescription("");
      await loadAdminData();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Could not save payment.");
    }
  };

  const updateSelectedOrderStatus = async (status: string) => {
    if (!selectedAdminOrder?.id) return;
    setAdminLoading(true);
    setAdminError("");

    try {
      const updated = await api.updateAdminOrderStatus(
        selectedAdminOrder.id,
        status,
      );
      setAdminOrders((current) =>
        current.map((order) =>
          order.id === updated.id ? { ...order, ...updated } : order,
        ),
      );
      setToast({ tone: "success", text: "Order status updated." });
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : "Could not update order.",
      );
    } finally {
      setAdminLoading(false);
    }
  };

  const settleCommission = async (commissionId: string) => {
    setAdminLoading(true);
    setAdminError("");

    try {
      const updated = await api.settleCommission(commissionId);
      setCommissions((current) =>
        current.map((commission) =>
          commission.id === updated.id ? updated : commission,
        ),
      );
      await loadAdminData();
      setToast({ tone: "success", text: "Commission settled." });
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : "Could not settle commission.",
      );
    } finally {
      setAdminLoading(false);
    }
  };

  const resetChat = async () => {
    setChatOpen(false);
    socketRef.current?.close();
    setConversationId(null);
    setChatConnected(false);
    setChatError("");
    setChatProductCards({});
    setMessages([
      {
        id: "welcome",
        sender: "agent",
        content: "أهلاً بيك.\nأنا كريم من Home Style.\nقولي محتاج إيه — منتج، شحن، أو أوردر.",
      },
    ]);
    try {
      const identityToken = await getChatIdentityToken();
      const session = await api.startChat({
        product: mainTab === "details" ? activeProduct ?? undefined : undefined,
        context: withNavigationHistory(chatContext),
        identityToken,
        forceNew: true,
      });
      setConversationId(session.conversationId);
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Could not reset chat.",
      );
    }
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart.length) {
      setToast({ tone: "error", text: "السلة فارغة." });
      return;
    }

    if (totalDeposit > 0 && !depositProofFile && !depositSentViaWhatsapp) {
      setToast({ tone: "error", text: "برجاء رفع صورة إيصال الديبوزيت أو تأكيد إرساله عبر واتساب." });
      return;
    }

    const form = new FormData(event.currentTarget);
    const totalShipping = cart.reduce((total, item) => total + (item.shippingPrice || 0) * item.quantity, 0);

    const payload: OrderPayload = {
      customer_name: String(form.get("customer_name") ?? ""),
      customer_phone: String(form.get("customer_phone") ?? ""),
      customer_governorate: String(form.get("customer_governorate") ?? ""),
      customer_address: String(form.get("customer_address") ?? ""),
      notes: String(form.get("notes") ?? ""),
      shipping_price: totalShipping,
      items: cart.map(({ product, quantity, shippingPrice, selectedLocation, selectedVariant }) => ({
        product_id: product.id,
        variant_id: selectedVariant ? selectedVariant.id : null,
        quantity,
        shipping_price: shippingPrice,
        shipping_location: selectedLocation,
      })),
    };

    setPendingOrderPayload(payload);
    setPolicyModalOpen(true);
  };

  const confirmPolicyAndCreateOrder = async (agreed: boolean) => {
    setPolicyModalOpen(false);
    if (!agreed || !pendingOrderPayload) {
      setPendingOrderPayload(null);
      return;
    }

    localStorage.setItem("furniture_customer_name", pendingOrderPayload.customer_name);
    localStorage.setItem("furniture_customer_phone", pendingOrderPayload.customer_phone);

    try {
      const order = await api.createOrder(pendingOrderPayload, depositProofFile);
      trackFunnelEvent('order_complete');
      setOrderResult(order);
      setCart([]);
      setCheckoutOpen(false);
      setDepositProofFile(null);
      setDepositProofPreview(null);
      setDepositSentViaWhatsapp(false);
      setPendingOrderPayload(null);
      if (hasAuthToken) loadMyOrders();
      setToast({ tone: "success", text: `تم إنشاء الطلب: ${order.order_number ?? order.id}` });
    } catch (error) {
      await api.saveAbandonedCart(pendingOrderPayload.customer_phone, cart).catch(() => null);
      setToast({
        tone: "error",
        text: `لم يتم إنشاء الطلب: ${error instanceof Error ? error.message : "حدث خطأ غير معروف"}`,
      });
    }
  };

  const trackOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!trackingNumber.trim()) return;

    try {
      setTrackedOrder(await api.trackOrder(trackingNumber.trim()));
      setToast({ tone: "success", text: "تم تحميل حالة الطلب" });
    } catch (error) {
      setTrackedOrder(null);
      setToast({
        tone: "error",
        text: `لم يتم تحميل حالة الطلب: ${error instanceof Error ? error.message : "حدث خطأ غير معروف"}`,
      });
    }
  };

  const trackExistingOrder = async (order: Order) => {
    const orderNumber = order.order_number;
    if (!orderNumber) return;

    setTrackingNumber(orderNumber);
    try {
      setTrackedOrder(await api.trackOrder(orderNumber));
      navigate("/track");
      setToast({ tone: "success", text: "تم تحميل حالة الطلب" });
    } catch (error) {
      setToast({
        tone: "error",
        text: `لم يتم تحميل حالة الطلب: ${error instanceof Error ? error.message : "حدث خطأ غير معروف"}`,
      });
    }
  };

  const submitAdminLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAdminLoading(true);
    setAdminError("");

    try {
      const tokens = await api.login(adminEmail, adminPassword);
      localStorage.setItem("furniture_access_token", tokens.access);
      localStorage.setItem("furniture_refresh_token", tokens.refresh);
      setAdminPassword("");
      await loadCustomerProfile();
      await loadAdminData();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "فشل تسجيل الدخول");
    } finally {
      setAdminLoading(false);
    }
  };

  const submitCustomerLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const tokens = await api.login(authEmail, authPassword);
      localStorage.setItem("furniture_access_token", tokens.access);
      localStorage.setItem("furniture_refresh_token", tokens.refresh);
      localStorage.setItem(
        "furniture_customer_email_key",
        authEmail.split("@")[0].toLowerCase(),
      );
      setAuthPassword("");
      await loadCustomerProfile();
      navigate("/orders");
      setToast({ tone: "success", text: "تم تسجيل الدخول بنجاح" });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "فشل تسجيل الدخول");
    } finally {
      setAuthLoading(false);
    }
  };

  const submitCustomerRegister = async (event: FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      await api.register({
        email: authEmail,
        password: authPassword,
        full_name: authName,
        phone_number: authPhone,
      });
      const tokens = await api.login(authEmail, authPassword);
      localStorage.setItem("furniture_access_token", tokens.access);
      localStorage.setItem("furniture_refresh_token", tokens.refresh);
      localStorage.setItem(
        "furniture_customer_email_key",
        authEmail.split("@")[0].toLowerCase(),
      );
      setAuthPassword("");
      await loadCustomerProfile();
      navigate("/orders");
      setToast({ tone: "success", text: "تم إنشاء الحساب بنجاح" });
    } catch (error) {
      let errorMessage = "حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.";
      let shouldSwitchToLogin = false;
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes("email") && (message.includes("مستخدم") || message.includes("exists") || message.includes("already"))) {
          errorMessage = "البريد الإلكتروني مستخدم بالفعل. سيتم تحويلك لتسجيل الدخول...";
          shouldSwitchToLogin = true;
        } else if (message.includes("phone") && (message.includes("مستخدم") || message.includes("exists") || message.includes("already"))) {
          errorMessage = "رقم الهاتف مستخدم بالفعل";
        } else if (message.includes("password") || message.includes("كلمة المرور")) {
          errorMessage = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
        } else if (message.includes("required") || message.includes("مطلوب")) {
          errorMessage = "يرجى ملء جميع الحقول المطلوبة";
        }
      }
      setAuthError(errorMessage);
      if (shouldSwitchToLogin) {
        setTimeout(() => {
          navigate("/login");
          setAuthError("");
        }, 2000);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const logoutCustomer = () => {
    localStorage.removeItem("furniture_access_token");
    localStorage.removeItem("furniture_refresh_token");
    setCustomerProfile(null);
    setMyOrders([]);
    setToast({ tone: "success", text: "تم تسجيل الخروج" });
    navigate("/products");
  };

  const updateAgentMode = async (payload: Partial<AgentSettingsState>) => {
    setAdminLoading(true);
    setAdminError("");

    try {
      const updated = await api.updateAgentSettings(payload);
      setAgentSettings(updated);
      setToast({ tone: "success", text: "تم تحديث إعدادات الوكيل" });
    } catch (error) {
      setAdminError(
        error instanceof Error
          ? error.message
          : "لم يتم تحديث إعدادات الوكيل",
      );
    } finally {
      setAdminLoading(false);
    }
  };

  const uploadAgentProductImages = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const files = form
      .getAll("images")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (!files.length) {
      setAdminError("اختر صورة منتج واحدة على الأقل");
      return;
    }

    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    setAgentUploadLoading(true);
    setAdminError("");

    try {
      const response = await api.uploadAgentImages(dataTransfer.files);
      event.currentTarget.reset();
      await loadAdminData();
      setToast({
        tone: "success",
        text: response.message ?? "تم إرسال الصور للوكيل",
      });
    } catch (error) {
      setAdminError(
        error instanceof Error
          ? error.message
          : "لم يتم رفع صور المنتج",
      );
    } finally {
      setAgentUploadLoading(false);
    }
  };

  const submitAdminAgentDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const sendForApproval = submitter?.value === "approve";
    const form = new FormData(event.currentTarget);
    form.set("previous_payload", JSON.stringify(adminAgentDraft ?? {}));
    form.set("send_for_approval", sendForApproval ? "true" : "false");

    setAdminAgentLoading(true);
    setAdminError("");

    try {
      const response = await api.createProductDraft(form);
      setAdminAgentDraft(response.draft);
      const sourceFiles = form
        .getAll("source_files")
        .filter((file) => file instanceof File && file.size > 0);
      const productFiles = form
        .getAll("product_images")
        .filter((file) => file instanceof File && file.size > 0);
      const missingFields = Array.isArray(response.draft.missing_fields)
        ? response.draft.missing_fields.map(String)
        : [];
      const agentReply = response.draft.ready_for_approval
        ? `${response.message}\nكل التفاصيل الأساسية جاهزة. راجع التفاصيل المنظمة، ولو موافق اضغط Send Approval to Telegram.`
        : `${response.message}\nناقص: ${missingFields.join(", ") || "تفاصيل إضافية"}. ابعتلي التصحيح في نفس الشات.`;
      setAdminAgentMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: "admin",
          content: sendForApproval
            ? "تمام، ابعت طلب الموافقة على تيليجرام."
            : String(
                form.get("source_text") ||
                  `Uploaded ${sourceFiles.length} requirements file(s) and ${productFiles.length} product image(s).`,
              ),
        },
        {
          id: crypto.randomUUID(),
          sender: "agent",
          content: agentReply,
        },
      ]);
      event.currentTarget.reset();
      if (sendForApproval && response.action_id) {
        setAdminAgentDraft(null);
        setAdminAgentMessages([
          {
            id: "admin-agent-ready",
            sender: "agent",
            content:
              "تم إرسال طلب الموافقة لتيليجرام. مساحة العمل نظيفة الآن، أرسل المنتج التالي عندما تكون جاهزاً.",
          },
        ]);
        setToast({
          tone: "success",
          text: "تم إرسال طلب الموافقة لتيليجرام",
        });
      }
    } catch (error) {
      setAdminError(
        error instanceof Error
          ? error.message
          : "لم يتم التواصل مع الوكيل",
      );
    } finally {
      setAdminAgentLoading(false);
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem("furniture_access_token");
    localStorage.removeItem("furniture_refresh_token");
    setCustomerProfile(null);
    setAgentSettings(null);
    setDashboardStats(null);
    setAdminOrders([]);
    setCommissions([]);
  };

  if (isAuthRoute) {
    if (hash === "#logout") {
      return (
        <main className="site-shell">
          <header className="nav-bar">
            <Link className="brand" to="/products">
              <img src="/favicon.svg" alt="Home Style" className="brand-logo" />
            </Link>
          </header>
          <section className="auth-section">
            <div className="admin-card login-card">
              <p className="eyebrow">تسجيل الخروج</p>
              <h1>خروج</h1>
              <p className="muted">
                إنهاء جلسة العميل على Home Style              </p>
              <button
                type="button"
                className="panel-primary"
                onClick={logoutCustomer}
              >
                خروج
              </button>
            </div>
          </section>
        </main>
      );
    }

    const isRegister = hash === "#register";

    return (
      <main className="site-shell">
        <header className="nav-bar">
          <Link className="brand" to="/products">
            <img src="/favicon.svg" alt="Home Style" className="brand-logo" />
          </Link>
          <nav aria-label="Auth navigation">
            <Link to="/products">Catalog</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </nav>
        </header>
        <section className="auth-section">
          <div className="auth-blob auth-blob-1" />
          <div className="auth-blob auth-blob-2" />
          <div className="auth-card">
            <div className="auth-icon-badge">
              <img src="/favicon.svg" alt="Home Style" />
            </div>
            <h2 className="auth-title">
              {isRegister ? "إنشاء حساب جديد" : "أهلاً بيك تاني"}
            </h2>
            <p className="auth-subtitle">
              {isRegister
                ? "سجّل بياناتك عشان تبدأ التسوق معانا"
                : "سجّل دخولك عشان تتابع طلباتك ومفضلتك"}
            </p>

            <div
              className={`auth-toggle ${isRegister ? "is-register" : "is-login"}`}
              role="tablist"
              aria-label="تسجيل الدخول أو إنشاء حساب"
            >
              <span className="auth-toggle-slider" aria-hidden="true" />
              <button
                type="button"
                role="tab"
                aria-selected={!isRegister}
                className={!isRegister ? "active" : ""}
                onClick={() => {
                  navigate("/login");
                }}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isRegister}
                className={isRegister ? "active" : ""}
                onClick={() => {
                  navigate("/register");
                }}
              >
                إنشاء حساب
              </button>
            </div>

            <form
              className="auth-form"
              onSubmit={isRegister ? submitCustomerRegister : submitCustomerLogin}
            >
              {isRegister && (
                <>
                  <label className="auth-field">
                    <User size={18} />
                    <input
                      value={authName}
                      onChange={(event) => setAuthName(event.target.value)}
                      placeholder="الاسم الكامل"
                      required
                    />
                  </label>
                  <label className="auth-field">
                    <Phone size={18} />
                    <input
                      value={authPhone}
                      onChange={(event) => setAuthPhone(event.target.value)}
                      placeholder="رقم الهاتف"
                      required
                    />
                  </label>
                </>
              )}
              <label className="auth-field">
                <Mail size={18} />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="البريد الإلكتروني"
                  required
                />
              </label>
              <label className="auth-field">
                <Lock size={18} />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="كلمة المرور"
                  required
                />
              </label>

              {!isRegister && (
                <button
                  type="button"
                  className="auth-forgot"
                  onClick={() => {
                    const message = "مرحباً، نسيت كلمة المرور بتاعتي، ممكن تساعدوني؟";
                    window.open(
                      `https://wa.me/201503466584?text=${encodeURIComponent(message)}`,
                      "_blank",
                    );
                  }}
                >
                  نسيت كلمة المرور؟
                </button>
              )}

              <button type="submit" className="auth-submit" disabled={authLoading}>
                {authLoading
                  ? "يرجى الانتظار..."
                  : isRegister
                    ? "إنشاء حساب"
                    : "تسجيل الدخول"}
              </button>

              {authError && <p className="inline-error">{authError}</p>}
            </form>

            <p className="auth-switch-text">
              {isRegister ? "لديك حساب بالفعل؟" : "معندكش حساب؟"}{" "}
              <Link to={isRegister ? "/login" : "/register"}>
                {isRegister ? "تسجيل الدخول" : "إنشاء حساب"}
              </Link>
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (isAnalyticsRoute) {
    if (!hasAdminToken) {
      return (
        <main className="site-shell admin-shell">
          <header className="nav-bar">
            <Link className="brand" to="/products">
              <img src="/favicon.svg" alt="Home Style" className="brand-logo" />
            </Link>
            <nav aria-label="Admin navigation">
              <Link to="/products">المتجر</Link>
              <Link to="/admin">لوحة الإدارة</Link>
            </nav>
          </header>
          <section className="auth-section">
            <form className="admin-card login-card" onSubmit={submitAdminLogin}>
              <h2>تسجيل دخول الإدارة لرؤية التحليلات</h2>
              <p className="muted">يرجى إدخال بيانات حساب المسؤول لعرض لوحة التحليلات.</p>
              <input
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="البريد الإلكتروني للإدارة"
                required
              />
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="كلمة المرور"
                required
              />
              <button
                type="submit"
                className="panel-primary"
                disabled={adminLoading}
              >
                {adminLoading ? "جاري تسجيل الدخول..." : "دخول"}
              </button>
              {adminError && <p className="inline-error">{adminError}</p>}
            </form>
          </section>
        </main>
      );
    }

    return (
      <AnalyticsDashboard onBack={() => setHash("#catalog")} />
    );
  }

  if (isAdminRoute) {
    return (
      <main className="site-shell admin-shell">
        <header className="nav-bar">
          <Link className="brand" to="/products">
            <img src="/favicon.svg" alt="Home Style" className="brand-logo" />
          </Link>
          <nav aria-label="Admin navigation">
            <Link to="/products">Storefront</Link>
            <Link to="/admin">Admin Panel</Link>
            <Link to="/analytics">لوحة التحليلات</Link>
          </nav>
          <div className="nav-actions">
            {hasAdminToken && (
              <button
                type="button"
                onClick={logoutAdmin}
                aria-label="Logout admin"
              >
                <Power size={20} />
              </button>
            )}
          </div>
        </header>

        <section className={`admin-panel ${hasAdminToken ? "admin-dashboard-layout" : ""}`}>
          {!hasAdminToken ? (
            <div className="admin-login-wrapper">
              <div className="admin-heading">
                <p className="eyebrow">لوحة الإدارة</p>
                <h1>تسجيل الدخول</h1>
              </div>
              <form className="admin-card login-card" onSubmit={submitAdminLogin}>

              <h2>تسجيل دخول الإدارة</h2>
              <input
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="البريد الإلكتروني للإدارة"
                required
              />
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="كلمة المرور"
                required
              />
              <button
                type="submit"
                className="panel-primary"
                disabled={adminLoading}
              >
                {adminLoading ? "جاري تسجيل الدخول..." : "دخول"}
              </button>
              {adminError && <p className="inline-error">{adminError}</p>}
            </form>
            </div>
          ) : (
            <>
              <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                  <h2>لوحة التحكم</h2>
                </div>
                <nav className="admin-sidebar-nav">
                  <button 
                    type="button"
                    className={activeAdminTab === "dashboard" ? "active" : ""} 
                    onClick={() => setActiveAdminTab("dashboard")}
                  >
                    <Home size={18} />
                    الرئيسية
                  </button>
                  <button 
                    type="button"
                    className={activeAdminTab === "orders" ? "active" : ""} 
                    onClick={() => { setActiveAdminTab("orders"); loadAdminData(); }}
                  >
                    <ShoppingBag size={18} />
                    إدارة الطلبات
                  </button>
                  <button 
                    type="button"
                    className={activeAdminTab === "commissions" ? "active" : ""} 
                    onClick={() => { setActiveAdminTab("commissions"); loadAdminData(); }}
                  >
                    <CheckCircle2 size={18} />
                    العمولات
                  </button>
                  <button 
                    type="button"
                    className={activeAdminTab === "payments" ? "active" : ""}
                    onClick={() => { setActiveAdminTab("payments"); loadAdminData(); }}
                  >
                    <ShoppingBag size={18} />
                    {"\u0645\u062f\u0641\u0648\u0639\u0627\u062a\u0646\u0627"}
                  </button>
                  <button type="button" className={activeAdminTab === "chats" ? "active" : ""} onClick={() => { setActiveAdminTab("chats"); loadAdminData(); }}>
                    <MessageCircle size={18} />
                    {"\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621"}
                  </button>
                  <button
                    type="button"
                    className={activeAdminTab === "agent" ? "active" : ""} 
                    onClick={() => setActiveAdminTab("agent")}
                  >
                    <MessageCircle size={18} />
                    خدمة العملاء AI
                  </button>
                  <button 
                    type="button"
                    className={activeAdminTab === "analytics" ? "active" : ""} 
                    onClick={() => setActiveAdminTab("analytics")}
                  >
                    <BarChart size={18} />
                    التحليلات
                  </button>
                </nav>
              </aside>
              <main className="admin-main-content">
                {activeAdminTab === "dashboard" && (
                  <div className="admin-tab-content">
                    <section className="admin-card">
                      <h2>إحصائيات المتجر</h2>
                      <div className="admin-stats">

                  <span>
                    <strong>{dashboardStats?.active_products ?? "-"}</strong>
                    منتجات
                  </span>
                  <span>
                    <strong>{dashboardStats?.total_orders ?? "-"}</strong>طلبات
                  </span>
                  <span>
                    <strong>{money(dashboardStats?.total_revenue)}</strong>
                    إيرادات
                  </span>
                  <span>
                    <strong>
                      {money(dashboardStats?.received_commissions)}
                    </strong>
                    عمولات مستلمة
                  </span>
                  <span><strong>{money(dashboardStats?.our_payments)}</strong>{"\u0645\u062f\u0641\u0648\u0639\u0627\u062a\u0646\u0627"}</span>
                  <span><strong>{money(dashboardStats?.net_profit)}</strong>{"\u0635\u0627\u0641\u064a \u0627\u0644\u0631\u0628\u062d"}</span>
                                      </div>
                    </section>
                  </div>
                )}
                {activeAdminTab === "orders" && (
                  <div className="admin-tab-content">
                    <section className="admin-card admin-orders-card">

                <div className="admin-card-title">
                  <ShoppingBag size={22} />
                  <h2>إدارة الطلبات</h2>
                  <button
                    type="button"
                    className="admin-mini-action"
                    onClick={() => loadAdminData()}
                  >
                    تحديث
                  </button>
                </div>
                <div className="admin-filter-row">
                  <select
                    value={adminOrderStatusFilter}
                    onChange={(event) =>
                      setAdminOrderStatusFilter(event.target.value)
                    }
                    aria-label="Filter admin orders by status"
                  >
                    <option value="">جميع الحالات</option>
                    <option value="pending_review">قيد المراجعة</option>
                    <option value="supplier_confirmed">
                      تأكيد المورد
                    </option>
                    <option value="out_for_delivery">خارج للتوصيل</option>
                    <option value="delivered">تم التوصيل</option>
                    <option value="commission_settled">
                      تم استلام العمولة
                    </option>
                    <option value="cancelled">ملغي</option>
                  </select>
                </div>
                <div className="admin-orders-layout">
                  <div className="admin-orders-list">
                    {adminOrders.length === 0 && (
                      <p className="muted">لا توجد طلبات</p>
                    )}
                    {adminOrders.map((order) => (
                      <button
                        type="button"
                        className={`admin-order-item ${selectedAdminOrderId === order.id ? "active" : ""}`}
                        onClick={() =>
                          setSelectedAdminOrderId(order.id ?? null)
                        }
                        key={order.id ?? order.order_number}
                      >
                        <strong>{order.order_number}</strong>
                        <span>
                          {order.customer_name} - {money(order.total_price)}
                        </span>
                        <small>{order.status}</small>
                      </button>
                    ))}
                  </div>
                  <div className="admin-order-detail">
                    {!selectedAdminOrder ? (
                      <p className="muted">اختر طلباً لإدارته</p>
                    ) : (
                      <>
                        <div className="admin-thread-header">
                          <strong>{selectedAdminOrder.order_number}</strong>
                          <span>{selectedAdminOrder.status}</span>
                        </div>
                        <dl className="admin-detail-list">
                          <div>
                            <dt>العميل</dt>
                            <dd>{selectedAdminOrder.customer_name}</dd>
                          </div>
                          <div>
                            <dt>الهاتف</dt>
                            <dd>{selectedAdminOrder.customer_phone}</dd>
                          </div>
                          <div>
                            <dt>المحافظة</dt>
                            <dd>{selectedAdminOrder.customer_governorate}</dd>
                          </div>
                          <div>
                            <dt>المجموع الفرعي (المنتجات)</dt>
                            <dd>{money(Number(selectedAdminOrder.total_price) - Number(selectedAdminOrder.shipping_price || 0))}</dd>
                          </div>
                          <div>
                            <dt>الشحن</dt>
                            <dd>{money(selectedAdminOrder.shipping_price)}</dd>
                          </div>
                          <div>
                            <dt>الإجمالي</dt>
                            <dd>{money(selectedAdminOrder.total_price)}</dd>
                          </div>
                          <div>
                            <dt>العمولة</dt>
                            <dd>
                              {selectedAdminOrder.commission
                                ? `${money(selectedAdminOrder.commission.amount)} - ${selectedAdminOrder.commission.is_settled ? "تم الاستلام" : "معلقة"}`
                                : "لا يوجد سجل عمولة"}
                            </dd>
                          </div>
                        </dl>
                        <div className="admin-items-list">
                          {(selectedAdminOrder.items ?? []).map((item) => (
                            <span
                              key={`${selectedAdminOrder.id}-${item.product_id}`}
                            >
                              {item.product_title} x{item.quantity} -{" "}
                              {money(item.price_at_order_time)}
                            </span>
                          ))}
                        </div>
                        <div className="admin-status-actions">
                          {[
                            "pending_review",
                            "supplier_confirmed",
                            "out_for_delivery",
                            "delivered",
                            "commission_settled",
                            "cancelled",
                          ].map((status) => (
                            <button
                              type="button"
                              onClick={() => updateSelectedOrderStatus(status)}
                              className={
                                selectedAdminOrder.status === status
                                  ? "active"
                                  : ""
                              }
                              key={status}
                            >
                              {status.replaceAll("_", " ")}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

                                </div>
                )}
                {activeAdminTab === "commissions" && (
                  <div className="admin-tab-content">
                    <section className="admin-card admin-commissions-card">

                <div className="admin-card-title">
                  <CheckCircle2 size={22} />
                  <h2>العمولات</h2>
                </div>
                <div className="admin-filter-row">
                  <select
                    value={commissionFilter}
                    onChange={(event) =>
                      setCommissionFilter(event.target.value)
                    }
                    aria-label="Filter commissions"
                  >
                    <option value="">جميع العمولات</option>
                    <option value="false">المعلقة فقط</option>
                    <option value="true">المستلمة فقط</option>
                  </select>
                </div>
                <div className="commission-list">
                  {commissions.length === 0 && (
                    <p className="muted">لا توجد عمولات</p>
                  )}
                  {commissions.map((commission) => (
                    <div className="commission-row" key={commission.id}>
                      <span>{money(commission.amount)}</span>
                      <strong>
                        {commission.is_settled ? "تم الاستلام" : "معلقة"}
                      </strong>
                      {!commission.is_settled && (
                        <button
                          type="button"
                          onClick={() => settleCommission(commission.id)}
                        >
                          تحديد كمستلمة
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          {activeAdminTab === "chats" && (
            <div className="admin-tab-content">
              <section className="admin-card admin-chat-card">
                <div className="admin-card-title">
                  <MessageCircle size={22} />
                  <h2>محادثات العملاء</h2>
                  <button
                    type="button"
                    className="admin-mini-action"
                    onClick={() => loadAdminData()}
                  >
                    تحديث
                  </button>
                </div>
                <div className="admin-chat-layout">
                  <div className="admin-chat-list">
                    {adminChats.length === 0 && (
                      <p className="muted">لا توجد محادثات بعد</p>
                    )}
                    {adminChats.map((chat) => {
                      const lastMessage = getChatLastMessage(chat);
                      const unread = isUnreadChat(chat);
                      return (
                        <button
                          type="button"
                          className={`admin-chat-item ${selectedAdminChatId === chat.id ? "active" : ""}`}
                          onClick={() => selectAdminChat(chat)}
                          key={chat.id}
                        >
                          <span>
                            <strong>
                              {chat.customer_name || chat.customer_identifier}
                            </strong>
                            {unread && <i>غير مقروء</i>}
                          </span>
                          <small>
                            {lastMessage?.content ?? "لا توجد رسائل بعد"}
                          </small>
                        </button>
                      );
                    })}
                  </div>

                  <div className="admin-chat-thread">
                    {!selectedAdminChat ? (
                      <p className="muted">اختر محادثة</p>
                    ) : (
                      <>
                        <div className="admin-thread-header">
                          <strong>
                            {selectedAdminChat.customer_name ||
                              selectedAdminChat.customer_identifier}
                          </strong>
                          <span>{selectedAdminChat.status}</span>
                        </div>
                        <div className="admin-thread-messages">
                          {selectedAdminChat.messages.map((message) => (
                            <div className={`admin-chat-message-row ${getMessageSender(message)}`} key={message.id}>
                              {message.content && <p className={`message ${getMessageSender(message)}`}>{message.content}</p>}
                              {(message.attachments ?? []).map((attachment) => {
                                const imageUrl = resolveAssetUrl(attachment.image_url ?? attachment.image);
                                return imageUrl ? <img className="chat-image" src={imageUrl} alt="Attachment" key={attachment.id} /> : null;
                              })}
                            </div>
                          ))}
                        </div>
                        <form
                          className="admin-reply-form"
                          onSubmit={sendAdminReply}
                        >
                          <input ref={adminReplyImageInputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={(event) => selectAdminReplyImages(Array.from(event.target.files ?? []))} />
                          <textarea
                            value={adminReplyDraft}
                            onChange={(event) =>
                              setAdminReplyDraft(event.target.value)
                            }
                            placeholder="اكتب رداً يدوياً..."
                          />
                          <button type="button" className="chat-attachment-button" onClick={() => adminReplyImageInputRef.current?.click()} aria-label="Attach images"><Paperclip size={18} /></button>
                          <button type="submit">رد</button>
                          {adminReplyPreviews.length > 0 && (
                            <div className="image-preview-list">
                              {adminReplyPreviews.map((preview, index) => (
                                <div className="image-preview" key={preview}>
                                  <img src={preview} alt="Preview" />
                                  <button type="button" onClick={() => removeAdminReplyImage(index)} aria-label="Remove image">×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
                {activeAdminTab === "payments" && (
                  <div className="admin-tab-content">
                    <section className="admin-card payments-card">
                      <div className="admin-card-title"><ShoppingBag size={22} /><h2>{"\u0645\u062f\u0641\u0648\u0639\u0627\u062a\u0646\u0627"}</h2></div>
                      <form className="payment-form" onSubmit={addPayment}>
                        <input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Amount" required />
                        <select value={paymentType} onChange={(event) => setPaymentType(event.target.value as StorePayment["payment_type"])}><option value="ads">Ads</option><option value="shipping">Shipping</option><option value="tools">Tools</option><option value="other">Other</option></select>
                        <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
                        <input value={paymentDescription} onChange={(event) => setPaymentDescription(event.target.value)} placeholder="Description" />
                        <button className="panel-primary" type="submit">Save</button>
                      </form>
                      <div className="payment-list">{payments.length === 0 ? <p className="muted">No payments recorded.</p> : payments.map((payment) => <div className="payment-row" key={payment.id}><strong>{money(payment.amount)}</strong><span>{payment.payment_type}</span><span>{payment.description || "-"}</span><time>{new Date(payment.paid_at).toLocaleDateString()}</time></div>)}</div>
                    </section>
                  </div>
                )}
                {activeAdminTab === "agent" && (
                  <div className="admin-tab-content admin-agent-grid">
                    <section className="admin-card">
                      <div className="admin-card-title">
                        <Settings size={22} />
                        <h2>وضع خدمة العملاء</h2>
                      </div>

                {adminLoading && <p className="muted">جاري تحميل بيانات الإدارة...</p>}
                {adminError && <p className="inline-error">{adminError}</p>}
                {agentSettings && (
                  <>
                    <label className="switch-row">
                      <span>تفعيل خدمة العملاء</span>
                      <input
                        type="checkbox"
                        checked={agentSettings.is_globally_active}
                        onChange={(event) =>
                          updateAgentMode({
                            is_globally_active: event.target.checked,
                          })
                        }
                      />
                    </label>
                    <div
                      className="mode-control"
                      role="group"
                      aria-label="وضع الرد"
                    >
                      <button
                        type="button"
                        className={
                          agentSettings.auto_reply_mode === "full_auto"
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          updateAgentMode({ auto_reply_mode: "full_auto" })
                        }
                      >
                        تلقائي كامل
                      </button>
                      <button
                        type="button"
                        className={
                          agentSettings.auto_reply_mode === "suggest_only"
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          updateAgentMode({ auto_reply_mode: "suggest_only" })
                        }
                      >
                        اقتراحات فقط
                      </button>
                      <button
                        type="button"
                        className={
                          agentSettings.auto_reply_mode === "off"
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          updateAgentMode({ auto_reply_mode: "off" })
                        }
                      >
                        إيقاف
                      </button>
                    </div>
                    <p className="admin-note">
                      الوضع الحالي:{" "}
                      <strong>{agentSettings.auto_reply_mode}</strong>. استخدم التلقائي الكامل عندما تريد من خدمة العملاء الرد على العملاء تلقائياً.
                    </p>
                  </>
                )}
              </section>

              
                    <section className="admin-card">
                      <div className="admin-card-title">
                        <ImageUp size={22} />
                        <h2>صور المنتج لخدمة العملاء</h2>

                </div>
                <p className="admin-note">
                  ارفع صور المنتجات أو لقطات الشاشة. خدمة العملاء ستقرأها كمدخلات وتعد إجراءات إنشاء المنتج.
                </p>
                <form
                  className="agent-upload-form"
                  onSubmit={uploadAgentProductImages}
                >
                  <input type="file" name="images" accept="image/*" multiple />
                  <button
                    type="submit"
                    className="panel-primary"
                    disabled={agentUploadLoading}
                  >
                    {agentUploadLoading ? "جاري الرفع..." : "إرسال"}
                  </button>
                </form>
              </section>

              
                    <section className="admin-card admin-agent-card">

                <div className="admin-card-title">
                  <MessageCircle size={22} />
                  <h2>خدمة العملاء</h2>
                </div>
                <p className="admin-note">
                  تواصل مع خدمة العملاء حتى يتم إعداد المسودة بشكل صحيح. أرسل نص المتطلبات أو صورة المتطلبات، ثم أرفق صور المنتج النهائية بشكل منفصل.
                </p>
                <div className="admin-agent-layout">
                  <div className="admin-agent-chat-column">
                    <div className="admin-thread-messages">
                      {adminAgentMessages.map((message) => (
                        <p
                          className={`message ${getMessageSender(message)}`}
                          key={message.id}
                        >
                          {cleanMessageContent(message.content)}
                        </p>
                      ))}
                    </div>
                    <form
                      className="admin-agent-form"
                      onSubmit={submitAdminAgentDraft}
                    >
                      <textarea
                        name="source_text"
                        placeholder="اكتب للإيجنت: استخرج المنتج، أو صحح الخامة/السعر/العمولة/التصنيف..."
                      />
                      <label>
                        <span>صورة المتطلبات بدلاً من النص</span>
                        <input
                          type="file"
                          name="source_files"
                          accept="image/*"
                          multiple
                        />
                      </label>
                      <label>
                        <span>صور المنتج النهائية لقاعدة البيانات</span>
                        <input
                          type="file"
                          name="product_images"
                          accept="image/*"
                          multiple
                        />
                      </label>
                      <div className="admin-agent-actions">
                        <button
                          type="submit"
                          name="intent"
                          value="draft"
                          disabled={adminAgentLoading}
                        >
                          {adminAgentLoading ? "جاري العمل..." : "إرسال"}
                        </button>
                        <button
                          type="submit"
                          name="intent"
                          value="approve"
                          disabled={
                            adminAgentLoading || !isDraftReady(adminAgentDraft)
                          }
                        >
                          إرسال الموافقة لتيليجرام
                        </button>
                      </div>
                    </form>
                  </div>
                  <aside className="admin-draft-panel">
                    <div className="admin-thread-header">
                      <strong>مسودة المنتج</strong>
                      <span>
                        {isDraftReady(adminAgentDraft)
                          ? "جاهز"
                          : "يحتاج تفاصيل"}
                      </span>
                    </div>
                    {!adminAgentDraft ? (
                      <p className="muted">
                        أرسل نص المتطلبات أو صورة لبدء الاستخراج.
                      </p>
                    ) : (
                      <>
                        <dl className="admin-draft-list">
                          {draftRows.map(([key, label]) => (
                            <div
                              className={adminAgentDraft[key] ? "" : "missing"}
                              key={key}
                            >
                              <dt>{label}</dt>
                              <dd>
                                {formatDraftValue(key, adminAgentDraft[key])}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        {Array.isArray(adminAgentDraft.missing_fields) &&
                          adminAgentDraft.missing_fields.length > 0 && (
                            <div className="draft-warning">
                              مفقود:{" "}
                              {adminAgentDraft.missing_fields
                                .map(String)
                                .join(", ")}
                            </div>
                          )}
                        <div className="draft-images">
                          <strong>صور المنتج</strong>
                          <span>
                            {Array.isArray(adminAgentDraft.images)
                              ? adminAgentDraft.images.length
                              : 0}{" "}
                            محفوظة في المسودة
                          </span>
                        </div>
                        <p className="admin-note">
                          لما التفاصيل تبقى مظبوطة، دوس زر إرسال الموافقة
                          لتيليجرام. بعد موافقتك هناك المنتج يتحفظ في قاعدة
                          البيانات.
                        </p>
                      </>
                    )}
                  </aside>
                </div>
              </section>

                                </div>
                )}
                {activeAdminTab === "analytics" && (
                  <div className="admin-tab-content">
                    <AnalyticsDashboard onBack={() => setActiveAdminTab("dashboard")} />
                  </div>
                )}
              </main>
            </>
          )}
        </section>

        {toast && (
          <div className={`toast ${toast.tone}`}>
            {toast.text}
            <button type="button" onClick={() => setToast(null)}>
              OK
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <WishlistProvider
      favorites={favorites}
      favoritesLoading={favoritesLoading}
      favoriteProducts={favoriteProducts}
      favoriteProductDetails={favoriteProductDetails}
      toggleFavorite={toggleFavorite}
      refreshFavorites={loadFavorites}
    >
    <RouteMeta
      pathname={location.pathname}
      product={mainTab === "details" ? activeProduct : null}
    />
    <main className="site-shell">
      <header className="nav-bar">
        <Link className="brand" to="/products">
          <img src="/favicon.svg" alt="Home Style" className="brand-logo" />
        </Link>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav
          aria-label="Primary navigation"
          className={mobileMenuOpen ? "mobile-open" : ""}
        >
          <Link
            to="/products"
            className={mainTab === "catalog" ? "active" : ""}
            onClick={() => setMobileMenuOpen(false)}
          >
            الكتالوج
          </Link>
          <Link
            to="/checkout"
            className={mainTab === "checkout" ? "active" : ""}
            onClick={() => setMobileMenuOpen(false)}
          >
            الدفع
          </Link>
          <Link
            to="/orders"
            className={mainTab === "orders" ? "active" : ""}
            onClick={() => setMobileMenuOpen(false)}
          >
            طلباتي
          </Link>
          <Link
            to="/track"
            className={mainTab === "track" ? "active" : ""}
            onClick={() => setMobileMenuOpen(false)}
          >
            تتبع الطلب
          </Link>
          <button
            type="button"
            onClick={() => {
              setAboutModalOpen(true);
              setMobileMenuOpen(false);
            }}
            className="nav-about-btn"
          >
            من نحن
          </button>
          
          {hasAdminToken && (
            <>
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                الإدارة
              </Link>
              <Link to="/analytics" onClick={() => setMobileMenuOpen(false)}>
                لوحة التحليلات
              </Link>
            </>
          )}
        </nav>
        <div className="nav-actions">
          <div className="search-container">
            {searchInputOpen && (
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchInputOpen(false);
                    navigate("/products");
                  }
                }}
                className="search-input"
                autoFocus
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (searchInputOpen && searchQuery.trim()) {
                  setSearchInputOpen(false);
                  navigate("/products");
                } else {
                  setSearchInputOpen(!searchInputOpen);
                }
              }}
              aria-label="Search products"
            >
              <Search size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingBag size={20} />
            <span>{cart.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setFavoritesDropdownOpen(!favoritesDropdownOpen)}
            aria-label="Open favorites"
            className={favoritesDropdownOpen ? "active" : ""}
          >
            <Heart size={20} />
            <span>{favorites.size}</span>
          </button>
          
          <div
            className="contact-dropdown-container"
            onMouseLeave={() => setContactDropdownOpen(false)}
            >
            <button
              type="button"
              onClick={() => setContactDropdownOpen(!contactDropdownOpen)}
              aria-label="تواصل معنا"
              title="تواصل معنا"
              className={`nav-contact-btn ${contactDropdownOpen ? "active" : ""}`}
            >
              <Share2 size={20} />
            </button>
            {contactDropdownOpen && (
              <div className="contact-dropdown">
                <a
                  href="https://wa.me/201503466584"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                  src="https://cdn.simpleicons.org/whatsapp/25D366"
                  alt="WhatsApp"
                  width="16"
                  height="16"
                  style={{ display: "inline-block", verticalAlign: "middle" }}
                />
                  <span>واتساب</span>
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61591355288049"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                  src="https://cdn.simpleicons.org/facebook/1877F2"
                  alt="Facebook"
                  width="16"
                  height="16"
                  style={{ display: "inline-block", verticalAlign: "middle" }}
                />
                  <span>فيسبوك</span>
                </a>
                <a
                  href="https://www.instagram.com/homestyle22237?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                  src="https://cdn.simpleicons.org/instagram/E4405F"
                  alt="Instagram"
                  width="16"
                  height="16"
                  style={{ display: "inline-block", verticalAlign: "middle" }}
                />
                  <span>انستجرام</span>
                </a>
              </div>
            )}
          </div>
          {customerProfile ? (
            <Link
              to="/logout"
              onClick={() => setMobileMenuOpen(false)}
              className="nav-auth-btn"
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
            >
              <LogOut size={20} />
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="nav-auth-btn"
              aria-label="تسجيل الدخول"
              title="تسجيل الدخول"
            >
              <LogIn size={20} />
            </Link>
          )}
        </div>
      </header>

      {favoritesDropdownOpen && (
        <div className="favorites-dropdown">
          <div className="favorites-dropdown-header">
            <h3>المفضلة</h3>
            <button
              type="button"
              onClick={() => setFavoritesDropdownOpen(false)}
              aria-label="Close favorites"
            >
              <X size={20} />
            </button>
          </div>
          {favoriteProducts.length === 0 ? (
            <div className="favorites-empty">
              <p>لا توجد منتجات في المفضلة</p>
            </div>
          ) : (
            <div className="favorites-grid">
              {favoriteProducts.map((fav) => {
                const loadedProduct =
                  products.find((p) => p.id === fav.product) ??
                  favoriteProductDetails[fav.product];
                // Fall back to the data returned by the favorites API itself
                // instead of skipping the item when it's not on the current
                // products page/filter (e.g. different category, page 2, etc.)
                const product: Product = loadedProduct ?? {
                  id: fav.product,
                  title: fav.product_title,
                  slug: fav.product_slug,
                  final_price: fav.product_final_price,
                  category_name: "",
                  images: null,
                };
                const image = loadedProduct
                  ? resolveAssetUrl(getImageUrl(product.images))
                  : null;
                return (
                  <article className="favorite-card" key={fav.id}>
                    <button
                      type="button"
                      className="favorite-card-image"
                      onClick={() => {
                        setFavoritesDropdownOpen(false);
                        openProductDetails(product);
                      }}
                    >
                      {image ? (
                        <img src={image} alt={product.title} />
                      ) : (
                        <span className="image-placeholder">No Image</span>
                      )}
                    </button>
                    <div className="favorite-card-content">
                      <p className="price">{money(product.final_price)}</p>
                      <h4>{product.title}</h4>
                    </div>
                    <div className="favorite-card-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setFavoritesDropdownOpen(false);
                          openProductDetails(product);
                        }}
                      >
                        التفاصيل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFavoritesDropdownOpen(false);
                          openContextChat(product);
                        }}
                      >
                        خدمة العملاء
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFavoritesDropdownOpen(false);
                          addToCart(product);
                        }}
                      >
                        أضف للسلة
                      </button>
                      <button
                        type="button"
                        className="remove-favorite-btn"
                        onClick={() => {
                          toggleFavorite(product.id);
                        }}
                      >
                        إزالة
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {aboutModalOpen && (
        <div className="modal-panel about-modal">
          <div className="about-content">
            <header>
              <h2>عن Home Style</h2>
              <button
                type="button"
                onClick={() => setAboutModalOpen(false)}
                aria-label="Close about"
              >
                <X size={24} />
              </button>
            </header>
            <div className="about-sections">
              <section className="about-section">
                <h3>افرش بيتك كله من مكان واحد</h3>
                <p>
                  في Home Style، بنقدملك أكبر تشكيلة متميزة في عالم الأثاث والديكور المنزلي، من قطعة واحدة لغرفة كاملة.
                  وحدات شاشة | نيش | بوفيه | جزامات | تسريحة مضيئة | ترابيزات أنتريه | بانكيت
                  كل اللي بيتك محتاجه، هتلاقيه عندنا بجودة عالية وسعر مناسب.
                </p>
              </section>
              <section className="about-section">
                <h3>إحنا مين؟</h3>
                <p>
                  Home Style مش مجرد متجر أثاث، إحنا بنجمعلك أفضل الورش والمصانع من مختلف أنحاء مصر في مكان واحد، وبنوصلهملك بكل سهولة من غير ما تتعب في الدور والمقارنة بين عشرات الأماكن. بندوّر عنك على أجود المنتجات من مصادر موثوقة، وبنراجعها قبل ما توصلك، عشان تضمن إنك بتاخد أفضل قطعة بأنسب سعر من غير أي مجهود منك.
                </p>
              </section>
              <section className="about-section">
                <h3>تجربة تسوق مختلفة</h3>
                <p>
                  إحنا مش بس بنبيع أثاث، إحنا بنقدملك تجربة شراء مريحة من الألف للياء - من اختيار القطعة اللي تناسب ذوقك، لحد ما توصلك لباب بيتك. باقل الأسعار في السوق، وبأجود الخامات المتاحة، عشان تفرش بيتك بثقة من غير ما تقلق على الجودة أو السعر.
                  كل منتج عندنا موضّح فيه نوع الخشب والخامة المستخدمة بالتفصيل في صفحة المنتج نفسها، عشان تختار وانت عارف بالظبط بتاخد إيه.
                </p>
              </section>
              <section className="about-section">
                <h3>التوصيل والاستلام</h3>
                <p>
                  بنحرص إن يوصلك طلبك بأسرع وقت ممكن، وبنوضحلك سياستنا بكل شفافية من الأول:
                </p>
                <ul>
                  <li><strong>مدة التوصيل:</strong> خلال أسبوع من تأكيد الطلب</li>
                  <li><strong>المعاينة عند الاستلام:</strong> تقدر تعاين طلبك أول ما يوصل، ولو في أي مشكلة تقدر ترفض الاستلام أو تعمل إرجاع فوري مع مندوب الشحن في نفس اللحظة، مع تحمّل تكلفة الشحن فقط</li>
                  <li><strong>بعد استلام الطلب:</strong> غير متاح الاسترجاع أو الاستبدال بعد مغادرة المندوب لمكان التسليم، فبنرجوك تتأكد من معاينة القطعة كويس قبل ما المندوب يمشي</li>
                  <li><strong>نطاق التسليم:</strong> التسليم بيكون أمام المنزل، وطلوع القطعة لباب الشقة ده اتفاق منفصل بينك وبين مندوب التوصيل مباشرة</li>
                </ul>
              </section>
              <section className="about-section">
                <h3>إحنا معاك دايمًا</h3>
                <p>
                  ثقتك هي أساس شغلنا، ولذلك بنشجعك تطّلع على آراء وتقييمات عملائنا وآخر عمليات التسليم الفعلية على أرض الواقع قبل ما تقرر.
                </p>
                <p className="about-signature">
                  Home Style — دايمًا في خدمتكم 🙏
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {mainTab === "catalog" && (
      <>
      <section className="hero-section">
        <img src={heroImage} alt="Modern living room" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="eyebrow">Home Style ماركت</p>
          <h1>Home Style</h1>
          <p>
            تصفح منتجات حقيقية، اسأل خدمة العملاء عن أي قطعة، وأنشئ طلبك من غير
            ما تسيب المتجر.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" to="/products">
              تصفح الكتالوج
            </Link>
            <button
              type="button"
              className="text-link"
              onClick={() => openContextChat()}
            >
              خدمة العملاء
            </button>
          </div>
        </div>
      </section>

      <section className="stats-strip" aria-label="API integration status">
        <span>
          <strong>{totalProducts}</strong>منتج متاح
        </span>
        <span>
          <strong>{categories.length}</strong>تصنيف
        </span>
        <span>
          <strong>{cart.length}</strong>في السلة
        </span>
      </section>


      <section id="catalog" className="product-section">
        <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p className="eyebrow">٠١ - الكتالوج</p>
            <h2>تصفح أحدث قطع الأثاث المتوفرة</h2>
          </div>
          <button
            type="button"
            className="filter-toggle-btn"
            onClick={() => setFiltersOpen(!filtersOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "var(--radius-btn)",
              background: filtersOpen ? "var(--cream)" : "var(--panel)",
              color: filtersOpen ? "var(--bg)" : "var(--cream)",
              border: "1px solid var(--line)",
              fontFamily: "var(--sans)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 180ms ease"
            }}
          >
            <Settings size={16} />
            {filtersOpen ? "إخفاء الفلاتر" : "تصفية المنتجات"}
          </button>
        </div>

        {filtersOpen && (
          <form
            className="toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              loadProducts();
            }}
          >
            <select
              className="toolbar-category"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              aria-label="فلترة حسب التصنيف"
            >
              <option value="">كل التصنيفات</option>
              {categories.map((category) => (
                <option value={category.slug} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              className="toolbar-min-price"
              type="number"
              min="0"
              value={minPriceFilter}
              onChange={(event) => setMinPriceFilter(event.target.value)}
              placeholder="أقل سعر"
              aria-label="أقل سعر"
            />
            <input
              className="toolbar-max-price"
              type="number"
              min="0"
              value={maxPriceFilter}
              onChange={(event) => setMaxPriceFilter(event.target.value)}
              placeholder="أعلى سعر"
              aria-label="أعلى سعر"
            />
            <button
              type="button"
              className="toolbar-toggle-filters"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              {filtersExpanded ? "إخفاء الفلاتر" : "فلاتر أكتر …"}
            </button>
            <div className={`toolbar-extra-filters${filtersExpanded ? " expanded" : ""}`}>
              <input
                className="toolbar-material"
                value={materialFilter}
                onChange={(event) => setMaterialFilter(event.target.value)}
                placeholder="فلترة حسب الخامة"
                aria-label="فلترة حسب الخامة"
              />
              <select
                className="toolbar-deposit"
                value={depositFilter}
                onChange={(event) => setDepositFilter(event.target.value)}
                aria-label="فلترة منتجات الديبوزيت"
              >
                <option value="">كل المنتجات</option>
                <option value="true">ديبوزيت فقط</option>
                <option value="false">بدون ديبوزيت</option>
              </select>
              <select
                className="toolbar-shipping"
                value={shippingFilter}
                onChange={(event) => setShippingFilter(event.target.value)}
                aria-label="فلترة نطاق الشحن"
              >
                <option value="">أي شحن</option>
                <option value="all_governorates">كل المحافظات</option>
                <option value="cairo_giza">القاهرة والجيزة فقط</option>
              </select>
            </div>
            <button type="submit" className="toolbar-submit">
              تطبيق
            </button>
          </form>
        )}

        {loading && (
          <div className="state-panel">
            <Loader2 className="spin" />
            <p>جاري تحميل المنتجات...</p>
          </div>
        )}

        {!loading && apiError && (
          <div className="state-panel error-state">
            <PackageSearch size={30} />
            <h3>الكتالوج غير متاح مؤقتاً</h3>
            <p>{apiError}</p>
            <p>تأكد من أن المتجر يعمل بشكل صحيح، ثم حاول مرة أخرى.</p>
            <button type="button" onClick={() => loadProducts()}>
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && !apiError && products.length === 0 && (
          <div className="state-panel">
            <PackageSearch size={30} />
            <h3>لا توجد منتجات</h3>
            <p>
              أضف منتجات من لوحة الإدارة وسيتم عرضها هنا تلقائياً.
            </p>
          </div>
        )}

        {!loading && !apiError && products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => {
              const image = resolveAssetUrl(getImageUrl(product.images));
              return (
                <article className="product-card" key={product.id}>
                  <button
                    type="button"
                    className="image-button"
                    onClick={() => openProductDetails(product)}
                    aria-label={`Open details for ${product.title}`}
                  >
                    {image ? (
                      <img src={image} alt={product.title} />
                    ) : (
                      <span className="image-placeholder">No Image</span>
                    )}
                    {!product.is_available && <span>Unavailable</span>}
                  </button>
                  <button
                    type="button"
                    className="favorite-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product.id);
                    }}
                    aria-label={favorites.has(product.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart
                      size={18}
                      fill={favorites.has(product.id) ? "#e74c3c" : "none"}
                      color={favorites.has(product.id) ? "#e74c3c" : "#333333"}
                    />
                  </button>
                  <div className="product-copy">
                    <p className="price">{money(product.final_price)}</p>
                    <h3>{product.title}</h3>
                    <p>
                      {product.material ?? "الخامة غير محددة"} /{" "}
                      {product.color ?? "اللون غير محدد"}
                    </p>
                  </div>
                  <div className="card-actions">
                    <div className="card-actions-row">
                      <button
                        type="button"
                        className="outline-btn"
                        onClick={() => openProductDetails(product)}
                      >
                        التفاصيل
                      </button>
                      <button
                        type="button"
                        className="outline-btn"
                        onClick={() => openContextChat(product)}
                      >
                        <MessageCircle size={15} />
                        تواصل مع البوت
                      </button>
                      <button
                        type="button"
                        className="outline-btn"
                        onClick={() => openProductWhatsapp(product)}
                      >
                        <img
  src="https://cdn.simpleicons.org/whatsapp/25D366"
  alt="WhatsApp"
  width="16"
  height="16"
  style={{ display: "inline-block", verticalAlign: "middle" }}
/>
                        الطلب من واتساب
                      </button>
                    </div>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => addToCart(product)}
                    >
                      أضف للسلة
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !apiError && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "42px", flexWrap: "nowrap", width: "100%", overflow: "visible" }}>
            <button
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentPage === 1}
              className="page-nav-btn prev"
              style={{ opacity: currentPage === 1 ? 0.3 : 1 }}
            >
              السابق
            </button>

            {(() => {
              const pages = [];
              const maxVisible = 4;
              if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                let start = Math.max(1, currentPage - 1);
                let end = Math.min(totalPages, currentPage + 2);
                if (start === 1) {
                  end = 4;
                } else if (end === totalPages) {
                  start = totalPages - 3;
                }
                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }
              }
              return pages;
            })().map((pageNum) => {
              const distance = Math.abs(pageNum - currentPage);
              return (
                <button
                  key={pageNum}
                  onClick={() => {
                    setCurrentPage(pageNum);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={{
                    minWidth: "36px",
                    height: "36px",
                    padding: "0 4px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-btn)",
                    background: currentPage === pageNum ? "var(--cream)" : "transparent",
                    color: currentPage === pageNum ? "var(--bg)" : "var(--cream)",
                    border: currentPage === pageNum ? "1px solid var(--cream)" : "1px solid var(--line)",
                    cursor: "pointer",
                    fontWeight: 500,
                    fontFamily: "var(--sans)",
                    fontSize: distance === 0 ? "14px" : distance === 1 ? "12px" : "10px",
                    opacity: distance === 0 ? 1 : distance === 1 ? 0.6 : 0.25,
                    transform: `scale(${distance === 0 ? 1 : distance === 1 ? 0.9 : 0.8})`,
                    transition: "all 150ms ease"
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentPage === totalPages}
              className="page-nav-btn next"
              style={{ opacity: currentPage === totalPages ? 0.3 : 1 }}
            >
              التالي
            </button>
          </div>
        )}
      </section>
      </>
      )}

      {mainTab === "details" && (
      <div className="details-page">
        <div className="details-header" style={{ padding: "16px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--panel)" }}>
          <button 
            type="button" 
            className="text-link-btn" 
            onClick={closeProductDetails}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "16px", color: "var(--cream)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <X size={20} />
            إغلاق التفاصيل والعودة
          </button>
        </div>
        {detailsLoading && (
          <div className="details-empty-state">
            <Loader2 className="spin" />
            <p className="eyebrow">تفاصيل المنتج</p>
            <h2>جاري تحميل المنتج...</h2>
          </div>
        )}
        {!detailsLoading && detailsError && (
          <div className="details-empty-state">
            <p className="eyebrow">تفاصيل المنتج</p>
            <h2>لم نقدر نحمل المنتج</h2>
            <p className="muted">{detailsError}</p>
            <Link className="primary-link" to="/products">
              تصفح الكتالوج
            </Link>
          </div>
        )}
        {!detailsLoading && !detailsError && !activeProduct && (
          <div className="details-empty-state">
            <p className="eyebrow">تفاصيل المنتج</p>
            <h2>اختر منتجًا من الكتالوج</h2>
            <p className="muted">
              اضغط "التفاصيل" على أي قطعة في الكتالوج عشان تشوف صورها
              ومواصفاتها وخيارات الشحن كاملة هنا.
            </p>
            <Link className="primary-link" to="/products">
              تصفح الكتالوج
            </Link>
          </div>
        )}
        {!detailsLoading && !detailsError && activeProduct &&
        (() => {
          const productImages = Array.isArray(activeProduct.images)
            ? activeProduct.images
            : [];
          const mainImageUrl =
            productImages.length > 0
              ? resolveAssetUrl(
                  getImageUrl(productImages[activeImageIndex]) ||
                    getImageUrl(productImages[0]),
                )
              : resolveAssetUrl(getImageUrl(activeProduct.images));

          return (
            <>
            <section id="details" className="detail-section">
              <div className="detail-gallery">
                {mainImageUrl ? (
                  <img
                    src={mainImageUrl}
                    alt={activeProduct.title}
                    className="main-detail-image"
                  />
                ) : (
                  <div className="detail-placeholder">
                    لا توجد صورة للمنتج
                  </div>
                )}

                {productImages.length > 1 && (
                  <div className="detail-thumbnails">
                    {productImages.map((img: unknown, idx: number) => {
                      const thumbUrl = resolveAssetUrl(getImageUrl(img));
                      if (!thumbUrl) return null;
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`thumbnail-btn ${idx === activeImageIndex ? "active" : ""}`}
                          onClick={() => setActiveImageIndex(idx)}
                          aria-label={`View image ${idx + 1}`}
                        >
                          <img
                            src={thumbUrl}
                            alt={`${activeProduct.title} thumbnail ${idx + 1}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="detail-copy">
                <p className="eyebrow">القطعة المختارة</p>
                <h2>{activeProduct.title}</h2>
                <p className="muted">{activeProduct.category_name}</p>
                <p>
                  {activeProduct.description ??
                    "لا يوجد وصف للمنتج"}
                </p>
                <dl className="spec-list">
                  <div>
                    <dt>الخامة</dt>
                    <dd>{activeProduct.material ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>اللون</dt>
                    <dd>{activeProduct.color ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>الأبعاد</dt>
                    <dd>{activeProduct.dimensions ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>العربون</dt>
                    <dd>
                      {activeProduct.requires_deposit
                        ? money(activeProduct.deposit_amount)
                        : "غير مطلوب"}
                    </dd>
                  </div>
                </dl>
                
                {activeProduct.shipping_summary && (
                  <div className="shipping-info">
                    <h4>خيارات الشحن</h4>
                    <p className="shipping-message">{activeProduct.shipping_summary.message}</p>
                    {activeProduct.shipping_rates && activeProduct.shipping_rates.length > 0 && (
                      <div className="shipping-rates-list">
                        {activeProduct.shipping_rates.map((rate, idx) => (
                          <div key={idx} className="shipping-rate-item">
                            <span>{rate.governorate_name}{rate.area_name ? ` - ${rate.area_name}` : ''}</span>
                            <span className="shipping-price">{rate.price === '0' ? 'مجاني' : money(rate.price)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeProduct.variants && activeProduct.variants.length > 0 && (
                  <div className="size-selector">
                    <h4>المقاسات والأسعار المتاحة</h4>
                    <div className="size-options">
                      {activeProduct.variants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          className={`size-option-btn ${detailSelectedVariant?.id === variant.id ? "active" : ""}`}
                          onClick={() => setDetailSelectedVariant(variant)}
                        >
                          {variant.size_name} — {money(variant.price)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="detail-price">
  {money(detailSelectedVariant ? detailSelectedVariant.price : activeProduct.final_price)}
</p>
                <div className="detail-actions">
                  <button
                    type="button"
                    className="detail-favorite-btn"
                    onClick={() => toggleFavorite(activeProduct.id)}
                  >
                    <Heart
                      size={20}
                      fill={favorites.has(activeProduct.id) ? "#e74c3c" : "none"}
                      color={favorites.has(activeProduct.id) ? "#e74c3c" : "#333333"}
                    />
                    {favorites.has(activeProduct.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openContextChat(activeProduct)}
                  >
                    تواصل مع خدمة العملاء
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(activeProduct.variants?.length) && !detailSelectedVariant}
                    onClick={() => proceedAddToCart(activeProduct, detailSelectedVariant)}
                  >
                    أضف للسلة
                  </button>
                  <button
                    type="button"
                    className="detail-whatsapp-btn"
                    onClick={() => openProductWhatsapp(activeProduct)}
                  >
                    <img
  src="https://cdn.simpleicons.org/whatsapp/25D366"
  alt="WhatsApp"
  width="16"
  height="16"
  style={{ display: "inline-block", verticalAlign: "middle" }}
/>
                    طلب عبر واتساب
                  </button>
                </div>
              </div>
            </section>

            {relatedProducts.length > 0 && (
              <section className="related-section">
                <div className="related-heading">
                  <p className="eyebrow">قد يعجبك أيضاً</p>
                  <h2>منتجات مشابهة</h2>
                </div>
                <div className="related-grid">
                  {relatedProducts.map((related) => {
                    const relatedImage = resolveAssetUrl(
                      getImageUrl(related.images),
                    );
                    return (
                      <article className="related-card" key={related.id}>
                        <button
                          type="button"
                          className="related-card-image"
                          onClick={() => openProductDetails(related)}
                          aria-label={`Open details for ${related.title}`}
                        >
                          {relatedImage ? (
                            <img src={relatedImage} alt={related.title} />
                          ) : (
                            <span className="image-placeholder">
                              No Image
                            </span>
                          )}
                        </button>
                        <div className="related-card-copy">
                          <p className="price">{money(related.final_price)}</p>
                          <h3>{related.title}</h3>
                        </div>
                        <div className="related-card-actions">
                          <button
                            type="button"
                            className="outline-btn"
                            onClick={() => openProductDetails(related)}
                          >
                            التفاصيل
                          </button>
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => addToCart(related)}
                          >
                            أضف للسلة
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
            </>
          );
        })()}
      </div>
      )}

      {mainTab === "checkout" && (
      <section id="checkout" className="checkout-section">
        <div>
          <p className="eyebrow">٠٢ - الطلبات</p>
          <h2>الدفع</h2>
          <p>
            كمّل بيانات طلبك وسيبنا نتابع معاك أول بأول.
          </p>
        </div>
        <button
          type="button"
          className="primary-link"
          onClick={() => openCheckout()}
        >
          فتح صفحة الدفع
        </button>
        {cart.length > 0 && (
          <div className="checkout-cart-display">
            <h3>سلتك</h3>
            <div className="checkout-cart-list">
              {cart.map((item) => (
                <div className="checkout-cart-item" key={cartItemKey(item.product, item.selectedVariant)}>
                  <div className="checkout-item-details">
                    <div className="checkout-item-header">
                      <strong>
                        {item.product.title}
                        {item.selectedVariant && <span className="variant-badge">{item.selectedVariant.size_name}</span>}
                      </strong>
                      <span className="price">{money(itemUnitPrice(item))}</span>
                    </div>
                    <div className="checkout-item-specs">
                      <p>الخامة: {item.product.material ?? "غير محدد"}</p>
                      <p>اللون: {item.product.color ?? "غير محدد"}</p>
                      <p>الأبعاد: {item.product.dimensions ?? "غير محدد"}</p>
                    </div>
                    {item.selectedLocation && (
                      <div className="checkout-item-shipping">
                        <span>الشحن إلى: {item.selectedLocation}</span>
                        <span className="shipping-price">{money((item.shippingPrice || 0) * item.quantity)}</span>
                      </div>
                    )}
                  </div>
                  <div className="checkout-item-actions">
                    <div className="quantity-control">
                      <button
                        type="button"
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.product, item.selectedVariant, Math.max(0, item.quantity - 1))}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button
                        type="button"
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.product, item.selectedVariant, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="view-details-btn"
                      onClick={() => openProductDetails(item.product)}
                    >
                      التفاصيل
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="checkout-cart-totals">
              <div className="total-row">
                <span>المجموع:</span>
                <strong>{money(subtotal)}</strong>
              </div>
              {totalShipping > 0 && (
                <div className="total-row">
                  <span>الشحن:</span>
                  <strong>{money(totalShipping)}</strong>
                </div>
              )}
              <div className="total-row grand-total">
                <span>الإجمالي:</span>
                <strong>{money(grandTotal)}</strong>
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      {mainTab === "orders" && (
      <section id="orders" className="my-orders-section">
        <div>
          <p className="eyebrow">٠٣ - طلباتي</p>
          <h2>المنتجات اللي طلبتها</h2>
          <p>
            العملاء المسجلين يقدروا يشوفوا طلباتهم السابقة هنا ويتابعوا أي منتج.
          </p>
        </div>
        <button type="button" className="text-link" onClick={loadMyOrders}>
          تحديث الطلبات
        </button>
        {ordersLoading && (
          <div className="state-panel compact-state">
            <Loader2 className="spin" />
            <p>جاري تحميل طلباتك...</p>
          </div>
        )}
        {!ordersLoading && ordersError && (
          <p className="inline-error">{ordersError}</p>
        )}
        {!ordersLoading && !ordersError && myOrders.length === 0 && (
          <p className="muted">
            لا توجد طلبات مرتبطة بعد. الطلبات التي تم إنشاؤها أثناء تسجيل الدخول ستظهر هنا.
          </p>
        )}
        {!ordersLoading && !ordersError && myOrders.length > 0 && (
          <div className="orders-grid">
            {myOrders.map((order) => (
              <article
                className="order-card"
                key={order.id ?? order.order_number}
              >
                <div>
                  <strong>{order.order_number}</strong>
                  <span>{order.status ?? "قيد الانتظار"}</span>
                </div>
                <div className="order-price-breakdown">
                  <div>
                    <span>المجموع الفرعي:</span>
                    <span>{money(Number(order.total_price) - Number(order.shipping_price || 0))}</span>
                  </div>
                  <div>
                    <span>الشحن:</span>
                    <span>{money(order.shipping_price)}</span>
                  </div>
                  <div className="total-row">
                    <span>الإجمالي:</span>
                    <span>{money(order.total_price)}</span>
                  </div>
                </div>
                <ul>
                  {(order.items ?? []).map((item) => (
                    <li key={`${order.id}-${item.product_id}`}>
                      {item.product_title} x{item.quantity}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => trackExistingOrder(order)}>
                  تتبع الطلب
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      )}

      {mainTab === "track" && (
      <section id="track" className="tracking-section">
        <div>
          <p className="eyebrow">٠٤ - التتبع</p>
          <h2>تتبع الطلب</h2>
        </div>
        <form className="tracking-form" onSubmit={trackOrder}>
          <input
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder="رقم الطلب"
            aria-label="رقم الطلب"
          />
          <button type="submit">تتبع</button>
        </form>
        {trackedOrder && (
          <div className="result-panel">
            <strong>{trackedOrder.order_number}</strong>
            <span>{trackedOrder.status}</span>
            <span>{money(trackedOrder.total_price)}</span>
          </div>
        )}
      </section>
      )}
      {mainTab === "notfound" && (
  <section className="details-page">
    <div className="details-empty-state">
      <p className="eyebrow">خطأ ٤٠٤</p>
      <h2>الصفحة اللي بتدور عليها مش موجودة</h2>
      <p className="muted">
        يمكن الرابط اتغيّر أو مش متاح دلوقتي. هنرجّعك للصفحة الرئيسية
        تلقائيًا خلال لحظات.
      </p>
      <Link className="primary-link" to="/products">
        العودة للصفحة الرئيسية
      </Link>
    </div>
  </section>
)}

      <button
        className="chat-launcher"
        type="button"
        onClick={() => openContextChat(mainTab === "details" ? activeProduct ?? undefined : undefined)}
        aria-label="Open customer service chat"
      >
        <MessageCircle size={24} />
        {customerUnreadCount > 0 && <span className="chat-unread-badge">{customerUnreadCount > 99 ? "99+" : customerUnreadCount}</span>}
      </button>

      {cartOpen && (
        <aside className="side-panel" aria-label="Cart">
          <header>
            <h2>السلة</h2>
            <button
              type="button"
              onClick={() => setCartOpen(false)}
              aria-label="Close cart"
            >
              <X size={20} />
            </button>
          </header>
          {cart.length === 0 ? (
            <p className="empty-copy">السلة فارغة.</p>
          ) : (
            <>
              <div className="cart-list">
                {cart.map((item) => (
                  <div className="cart-row" key={cartItemKey(item.product, item.selectedVariant)}>
                    <div>
                    <strong>{item.product.title}</strong>
                    {item.selectedVariant && <small className="variant-badge">{item.selectedVariant.size_name}</small>}
                    <span>{money(itemUnitPrice(item))}</span>
                    {item.selectedLocation && (
                      <small className="shipping-info">
                        الشحن إلى: {item.selectedLocation} ({money((item.shippingPrice || 0) * item.quantity)})
                      </small>
                    )}
                  </div>
                    <div className="quantity-control">
                      <button
                        type="button"
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.product, item.selectedVariant, Math.max(0, item.quantity - 1))}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button
                        type="button"
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.product, item.selectedVariant, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <span>المجموع الفرعي</span>
                <strong>{money(subtotal)}</strong>
              </div>
              {totalShipping > 0 && (
                <div className="cart-total">
                  <span>الشحن</span>
                  <strong>{money(totalShipping)}</strong>
                </div>
              )}
              <div className="cart-total grand-total">
                <span>الإجمالي</span>
                <strong>{money(grandTotal)}</strong>
              </div>
              <div className="cart-checkout-buttons">
                <button
                  type="button"
                  className="panel-primary"
                  onClick={() => {
                    openCheckout();
                    setCartOpen(false);
                  }}
                >
                  إتمام الطلب
                </button>
                <button
                  type="button"
                  className="whatsapp-checkout-btn"
                  onClick={() => {
                    const orderMessage = cart.map(item =>
                      `• ${item.product.title} - الكمية: ${item.quantity} - ${money(item.product.final_price * item.quantity)}\nرابط المنتج: ${productPageUrl(item.product)}`
                    ).join('\n');
                    const message = `مرحباً، أريد إنشاء طلب جديد:\n\n${orderMessage}\n\nالمجموع: ${money(subtotal)}\nالشحن: ${money(totalShipping)}\nالإجمالي: ${money(grandTotal)}`;
                    const whatsappUrl = `https://wa.me/201503466584?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                >
                  <img
  src="https://cdn.simpleicons.org/whatsapp/25D366"
  alt="WhatsApp"
  width="16"
  height="16"
  style={{ display: "inline-block", verticalAlign: "middle" }}
/>
                  طلب عبر واتساب
                </button>
              </div>
            </>
          )}
        </aside>
      )}

      {checkoutOpen && (
        <aside className="modal-panel" aria-label="Checkout">
          <form className="checkout-form" onSubmit={submitOrder}>
            <header>
              <h2>الدفع</h2>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                aria-label="Close checkout"
              >
                <X size={20} />
              </button>
            </header>
            <input name="customer_name" placeholder="الاسم ثنائى" required />
            <input name="customer_phone" placeholder="رقم الهاتف" required />
            <input
              name="customer_governorate"
              placeholder="المحافظة"
              required
            />
            <textarea
              name="customer_address"
              placeholder="العنوان بالتفصيل "
              required
            />
            <textarea name="notes" placeholder="اللون والمقاس المطلوب اذا كان المنتج له اكثر من مقاس" />
            <div className="checkout-summary">
              <div className="summary-row">
                <span>المجموع الفرعي</span>
                <strong>{money(subtotal)}</strong>
              </div>
              {totalShipping > 0 && (
                <div className="summary-row">
                  <span>الشحن</span>
                  <strong>{money(totalShipping)}</strong>
                </div>
              )}
              <div className="summary-row total">
                <span>الإجمالي</span>
                <strong>{money(grandTotal)}</strong>
              </div>
            </div>
            {totalDeposit > 0 && (
              <div className="deposit-proof-section">
                <p className="deposit-note">
                  ⚠️ هذا الطلب يتطلب ديبوزيت بقيمة <strong>{money(totalDeposit)}</strong>.
                  حوّله على فودافون كاش على الرقم التالي وارفع صورة التحويل، أو ابعتهالنا على واتساب.
                </p>
                <div className="deposit-phone-row">
                  <span className="deposit-phone">{DEPOSIT_PHONE_DISPLAY}</span>
                  <button type="button" onClick={copyDepositPhone}>نسخ الرقم</button>
                </div>

                <label className="deposit-upload">
                  <ImageUp size={18} />
                  {depositProofFile ? "تغيير صورة الإيصال" : "رفع صورة إيصال التحويل"}
                  <input type="file" accept="image/*" onChange={handleDepositFileChange} hidden />
                </label>
                {depositProofPreview && (
                  <img src={depositProofPreview} alt="إيصال الديبوزيت" className="deposit-preview" />
                )}

                <div className="deposit-whatsapp-alt">
                  <button type="button" onClick={sendDepositViaWhatsapp}>
                    <MessageCircle size={16} /> إرسال الإيصال عبر واتساب
                  </button>
                  <label>
                    <input
                      type="checkbox"
                      checked={depositSentViaWhatsapp}
                      onChange={(e) => {
                        setDepositSentViaWhatsapp(e.target.checked);
                        if (e.target.checked) {
                          setDepositProofFile(null);
                          setDepositProofPreview(null);
                        }
                      }}
                    />
                    تم إرسال صورة الإيصال عبر واتساب
                  </label>
                </div>
              </div>
            )}

            <button type="submit" className="panel-primary">
              إنشاء الطلب
            </button>
          </form>
        </aside>
      )}
      {policyModalOpen && (
        <div className="modal-overlay">
          <div className="policy-modal">
            <h3>التوصيل والاستلام</h3>
            <p className="policy-intro">
              بنحرص إن يوصلك طلبك بأسرع وقت ممكن، وبنوضحلك سياستنا بكل شفافية من الأول:
            </p>
            <ul className="policy-list">
              <li>
                <strong>مدة التوصيل:</strong> خلال أسبوع من تأكيد الطلب.
              </li>
              <li>
                <strong>المعاينة عند الاستلام:</strong> تقدر تعاين طلبك أول ما يوصل، ولو في أي
                مشكلة تقدر ترفض الاستلام أو تعمل إرجاع فوري مع مندوب الشحن في نفس اللحظة، مع
                تحمّل تكلفة الشحن فقط.
              </li>
              <li>
                <strong>بعد استلام الطلب:</strong> غير متاح الاسترجاع أو الاستبدال بعد مغادرة
                المندوب لمكان التسليم، فبنرجوك تتأكد من معاينة القطعة كويس قبل ما المندوب يمشي.
              </li>
              <li>
                <strong>نطاق التسليم:</strong> التسليم بيكون أمام المنزل، وطلوع القطعة لباب
                الشقة ده اتفاق منفصل بينك وبين مندوب التوصيل مباشرة.
              </li>
            </ul>
            <div className="policy-actions">
              <button type="button" className="policy-reject" onClick={() => confirmPolicyAndCreateOrder(false)}>
                رفض
              </button>
              <button type="button" className="policy-approve" onClick={() => confirmPolicyAndCreateOrder(true)}>
                موافقة وإتمام الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {locationModalOpen && activeProduct && (
        <aside className="modal-panel" aria-label="Select shipping location">
          <div className="location-modal">
            <header>
              <h2>اختيار منطقة الشحن</h2>
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                aria-label="Close location modal"
              >
                <X size={20} />
              </button>
            </header>
            <p className="location-product-name">{activeProduct.title}</p>
            {activeProduct.shipping_rates && activeProduct.shipping_rates.length > 0 ? (
              <div className="location-options">
                {activeProduct.shipping_rates.map((rate, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="location-option"
                    onClick={() => selectShippingLocation(
                      activeProduct,
                      `${rate.governorate_name}${rate.area_name ? ` - ${rate.area_name}` : ''}`,
                      Number(rate.price)
                    )}
                  >
                    <span>{rate.governorate_name}{rate.area_name ? ` - ${rate.area_name}` : ''}</span>
                    <span className="location-price">{rate.price === '0' ? 'مجاني' : money(rate.price)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">لا توجد خيارات شحن متاحة لهذا المنتج.</p>
            )}
          </div>
        </aside>
      )}

      {sizeModalOpen && activeProduct && (
  <aside className="modal-panel" aria-label="Select product size">
    <div className="location-modal">
      <header>
        <h2>اختيار المقاس</h2>
        <button type="button" onClick={() => setSizeModalOpen(false)} aria-label="Close size modal">
          <X size={20} />
        </button>
      </header>
      <p className="location-product-name">{activeProduct.title}</p>
      {activeProduct.variants && activeProduct.variants.length > 0 ? (
        <div className="location-options">
          {activeProduct.variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              className="location-option"
              onClick={() => selectProductSize(activeProduct, variant)}
            >
              <span>{variant.size_name}</span>
              <span className="location-price">{money(variant.price)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">لا توجد مقاسات متاحة لهذا المنتج.</p>
      )}
    </div>
  </aside>
)}


      {chatOpen && (
        <aside className="chat-panel" aria-label="Customer service chat">
          <header>
            <div>
              <p className="eyebrow">مساعد ذكي</p>
              <h2>خدمة العملاء</h2>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </header>
          <div className="context-pill">
            بتتصفح: {chatContext.product_name ?? "المتجر"}
            <span>{chatConnected ? "متصل" : "غير متصل"}</span>
          </div>
          {chatError && <p className="inline-error">{chatError}</p>}
          <div className="messages">
            {messages.map((message) => (
              <div key={message.id}>
                {message.content && (
                  <p className={`message ${getMessageSender(message)}`}>
                    {message.content}
                  </p>
                )}
                {(message.attachments ?? []).map((attachment) => {
                  const imageUrl = resolveAssetUrl(attachment.image_url ?? attachment.image);
                  return imageUrl ? <img className="chat-image" src={imageUrl} alt="Attachment" key={attachment.id} /> : null;
                })}
                {(chatProductCards[String(message.id)] ?? []).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="chat-product-card"
                    onClick={() => {
                      const product = products.find((item) => item.id === card.id);
                      if (product) void openProductDetails(product);
                    }}
                  >
                    {card.image_url && resolveAssetUrl(card.image_url) && (
                      <img src={resolveAssetUrl(card.image_url)!} alt={card.title} />
                    )}
                    <span>{card.title}</span>
                    <strong>{money(card.final_price)}</strong>
                    {card.requires_deposit && card.deposit_amount ? (
                      <small>ديبوزيت {money(card.deposit_amount)}</small>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <form className="chat-form" onSubmit={sendMessage}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="اسأل عن هذا المنتج..."
              aria-label="Chat message"
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <input ref={chatImageInputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={(event) => selectChatImages(Array.from(event.target.files ?? []))} />
            <button type="button" className="chat-attachment-button" onClick={() => chatImageInputRef.current?.click()} aria-label="Attach images"><Paperclip size={18} /></button>
            <button type="submit" aria-label="Send message">
              <Send size={18} />
            </button>
            {chatImages.length > 0 && <small className="attachment-count">{chatImages.length} image(s)</small>}
            {chatImagePreviews.length > 0 && (
              <div className="image-preview-list">
                {chatImagePreviews.map((preview, index) => (
                  <div className="image-preview" key={preview}>
                    <img src={preview} alt="Preview" />
                    <button type="button" onClick={() => removeChatImage(index)} aria-label="Remove image">×</button>
                  </div>
                ))}
              </div>
            )}
          </form>
          <button type="button" className="reset-chat" onClick={resetChat}>
            بدء محادثة جديدة
          </button>
        </aside>
      )}

      {orderResult && (
        <div className="toast success">
          تم إنشاء الطلب: {orderResult.order_number ?? orderResult.id}
          <button type="button" onClick={() => setOrderResult(null)}>
            OK
          </button>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.tone}`}>
          {toast.text}
          <button type="button" onClick={() => setToast(null)}>
            OK
          </button>
        </div>
      )}
    </main>
    </WishlistProvider>
  );
}

export default App;
