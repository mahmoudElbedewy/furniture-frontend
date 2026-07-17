import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  Heart,
  ImageUp,
  Loader2,
  Menu,
  MessageCircle,
  PackageSearch,
  Power,
  Search,
  Send,
  Settings,
  ShoppingBag,
  X,
} from "lucide-react";
import "./App.css";
import AnalyticsDashboard from "./components/AnalyticsDashboard/AnalyticsDashboard";

type Category = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  variants?: ProductVariant[];
  description?: string | null;
  material?: string | null;
  color?: string | null;
  dimensions?: string | null;
  final_price: string;
  is_available?: boolean;
  category_name: string;
  requires_deposit?: boolean;
  deposit_amount?: string | null;
  deposit_note?: string | null;
  default_shipping_price?: string | null;
  ships_nationwide?: boolean;
  images?: unknown;
  shipping_rates?: Array<{
    governorate_name: string;
    area_name: string | null;
    price: string;
  }>;
  shipping_summary?: {
    free_shipping_areas: string[];
    paid_shipping_areas: Array<{
      price: string;
      areas: string[];
      count: number;
    }>;
    has_free_shipping: boolean;
    default_price: string | null;
    message: string;
  };
};

type PaginatedProducts = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
};
type ProductVariant = {
  id: string;
  size_name: string;
  price: string;
  is_available?: boolean;
};

type CartItem = {
  product: Product;
  quantity: number;
  selectedLocation?: string | null;
  shippingPrice?: number;
  selectedVariant?: ProductVariant | null;
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
  product_id?: string;
  product_name?: string;
  category_name?: string;
};

type ChatMessage = {
  id: string | number;
  sender?: "customer" | "agent" | "admin" | "system";
  sender_type?: "customer" | "agent" | "admin";
  content: string;
  timestamp?: string;
  cardEndpoint?: string;
};

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
  active_products: number;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ??
  (import.meta.env.DEV
    ? "ws://127.0.0.1:8000"
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`);

const heroImage =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=85";

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
};

async function request<T>(path: string, init: RequestInit = {}, isRetry = false) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const authHeaders = getAuthHeaders();

  const requiresAuth =
    path.startsWith("/api/admin/") ||
    path.startsWith("/api/auth/me/") ||
    path.startsWith("/api/auth/logout/") ||
    path.startsWith("/api/orders/mine/");

  const shouldSendOptionalAuth =
  Boolean(authHeaders.Authorization) &&
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
  async startChat(product?: Product, forceNew = false) {
    const isAuthenticated = Boolean(getAuthHeaders().Authorization);
    const identityToken = isAuthenticated ? null : await this.ensureIdentity();

    const payload = await request<
  Record<string, string> & {
    identifier?: string;
    identity_token?: string;
    customer_identifier?: string;
  }
>("/api/chat/start/", {
      method: "POST",
      body: JSON.stringify({
        identity_token: identityToken,
        customer_name:
          localStorage.getItem("furniture_customer_name") ?? "Guest Customer",
        product_id: product?.id,
        force_new: forceNew,
      }),
    });

    if (payload?.identity_token) {
      setStoredIdentity(payload.customer_identifier ?? "", payload.identity_token);
    }

    const conversationId = payload?.id ?? payload?.conversation_id;
    if (!conversationId)
      throw new Error("Chat start response did not include a conversation id.");
    return conversationId;
  },
  async sendChatMessage(
  conversationId: string,
  payload: { message: string; sender_type: "customer"; context: ChatContext },
) {
  const isAuthenticated = Boolean(getAuthHeaders().Authorization);
  const identityToken = isAuthenticated ? null : getStoredIdentityToken();
  return request<{ messages: ChatMessage[]; agent_error?: string }>(
    `/api/chat/${conversationId}/send/`,
    {
      method: "POST",
      body: JSON.stringify({ ...payload, identity_token: identityToken }),
    },
  );
},
  async getChatHistory(conversationId: string) {
  const isAuthenticated = Boolean(getAuthHeaders().Authorization);
  const identityToken = isAuthenticated ? "" : getStoredIdentityToken() ?? "";
  const payload = await request<{ conversation_status: string; messages: ChatMessage[] }>(
    `/api/chat/${conversationId}/history/?identity_token=${encodeURIComponent(identityToken)}`,
  );
  return { ...payload, messages: payload.messages.map(normalizeMessage) };
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
  const existingToken = getStoredIdentityToken();
  const payload = await request<{ identifier: string; identity_token: string }>(
    "/api/auth/identity/",
    {
      method: "POST",
      body: JSON.stringify(existingToken ? { identity_token: existingToken } : {}),
    },
  );
  setStoredIdentity(payload.identifier, payload.identity_token);
  return payload.identity_token;
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
  async adminReply(conversationId: string, content: string) {
    const message = await request<ChatMessage>(
      `/api/admin/chats/${conversationId}/reply/`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      },
    );
    return normalizeMessage(message);
  },
async toggleFavorite(productId: string, identityToken: string) {
  return request<{ message?: string } | { id: string; product: string; customer_identifier: string; created_at: string }>("/api/catalog/favorites/toggle/", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, identity_token: identityToken }),
  });
},
async checkFavorite(productId: string, identityToken: string) {
  return request<{ is_favorited: boolean }>(
    `/api/catalog/favorites/check/?product_id=${encodeURIComponent(productId)}&identity_token=${encodeURIComponent(identityToken)}`,
  );
},
async listFavorites(identityToken: string) {
  return request<Array<{ id: string; product: string; product_title: string; product_slug: string; product_final_price: string; customer_identifier: string; created_at: string }>>(
    `/api/catalog/favorites/?identity_token=${encodeURIComponent(identityToken)}`,
  );
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

function App() {
  const [hash, setHash] = useState(window.location.hash || "#catalog");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedShippingLocation, setSelectedShippingLocation] = useState<string | null>(null);
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
  const [savedScrollPos, setSavedScrollPos] = useState(0);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
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
  const [commissionFilter, setCommissionFilter] = useState("");
  const [adminChats, setAdminChats] = useState<ChatConversation[]>([]);
  const [selectedAdminChatId, setSelectedAdminChatId] = useState<string | null>(
    null,
  );
  const [adminReplyDraft, setAdminReplyDraft] = useState("");
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
  const [favoriteProducts, setFavoriteProducts] = useState<Array<{ id: string; product_title: string; product_slug: string; product_final_price: string; customer_identifier: string; created_at: string }>>([]);
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

  const isAnalyticsRoute = hash === "#analytics";
  const isAdminRoute =
    hash === "#admin" || window.location.pathname.startsWith("/admin-panel");
  const isAuthRoute =
    hash === "#login" || hash === "#register" || hash === "#logout";
  const hasAuthToken = Boolean(localStorage.getItem("furniture_access_token"));
  const hasAdminToken = hasAuthToken && customerProfile?.role === "admin";
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, []);
  useEffect(() => {
    const syncHash = () => setHash(window.location.hash || "#catalog");
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

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
      const params = new URLSearchParams({ page: currentPage.toString() });
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

      const [categoryPayload, productPayload] = await Promise.all([
        api.listCategories().catch(() => []),
        api.listProducts(params),
      ]);

      let productResults: Product[] = [];
      if (Array.isArray(productPayload)) {
        productResults = productPayload;
        setTotalPages(1);
        setTotalProducts(productPayload.length);
      } else {
        productResults = productPayload.results || [];
        setTotalPages(Math.ceil((productPayload.count || 0) / 12) || 1);
        setTotalProducts(productPayload.count || 0);
      }

      setCategories(categoryPayload);
      setProducts(productResults);
      setActiveProduct((current) => current ?? productResults[0] ?? null);
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
  ]);

  const loadCustomerProfile = useCallback(async () => {
    if (!localStorage.getItem("furniture_access_token")) {
      setCustomerProfile(null);
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

  const loadFavorites = useCallback(async () => {
    const customerIdentifier = await getCustomerIdentifier();
    if (!customerIdentifier) return;

    try {
      setFavoritesLoading(true);
      const favoritesData = await api.listFavorites(customerIdentifier);
      const favoriteIds = new Set(favoritesData.map((f) => f.product));
      setFavorites(favoriteIds);
      setFavoriteProducts(favoritesData);
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setFavoritesLoading(false);
    }
  }, [getCustomerIdentifier]);

  const toggleFavorite = useCallback(async (productId: string) => {
    const customerIdentifier = await getCustomerIdentifier();
    if (!customerIdentifier) return;

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
  }, [getCustomerIdentifier, favoriteClicks, loadFavorites]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!conversationId) return;

    const accessToken = localStorage.getItem("furniture_access_token");
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
        if (!content) return;

        const normalized = normalizeMessage({
          id: crypto.randomUUID(),
          sender: payload.sender_type ?? "agent",
          content,
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
  }, [conversationId]);

  useEffect(() => {
    if (!chatOpen || !conversationId) return;

    const refreshHistory = async () => {
      try {
        const history = await api.getChatHistory(conversationId);
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
  }, [chatOpen, conversationId]);

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
      setAgentSettings(settingsPayload);
      setDashboardStats(statsPayload);
      setAdminChats(chatsPayload);
      setAdminOrders(ordersPayload);
      setCommissions(commissionsPayload);
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
    "catalog" | "details" | "checkout" | "orders" | "track"
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
    return "catalog";
  }, [hash]);

  const chatContext = useMemo<ChatContext>(() => {
    if (!activeProduct) return { current_page: window.location.pathname };

    return {
      current_page: `/products/${activeProduct.slug}`,
      product_id: activeProduct.id,
      product_name: activeProduct.title,
      category_name: activeProduct.category_name,
    };
  }, [activeProduct]);

  const subtotal = cart.reduce(
    (total, item) => total + itemUnitPrice(item) * item.quantity,
    0,
  );

  const totalShipping = cart.reduce(
    (total, item) => total + (item.shippingPrice || 0),
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
  window.history.replaceState(null, "", `/products/${product.slug}#details`);
  setHash("#details");
  window.setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 0);

  try {
    const trackedProduct = await api.getProduct(product.slug);
    setActiveProduct(trackedProduct);
    setDetailSelectedVariant(pickDefaultVariant(trackedProduct));
  } catch (error) {
    setToast({
      tone: "error",
      text: `Could not load product details: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
};

const closeProductDetails = () => {
  window.history.pushState(null, "", "/#catalog");
  setHash("#catalog");
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

const addItemToCart = (
  product: Product,
  variant: ProductVariant | null,
  location: string | null,
  shippingPrice: number,
) => {
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

  const openContextChat = async (product?: Product) => {
    const contextProduct = product ?? activeProduct ?? undefined;
    if (contextProduct) setActiveProduct(contextProduct);
    setChatOpen(true);
    setChatError("");

    try {
      const id = await api.startChat(contextProduct);
      if (conversationId && conversationId !== id) {
        socketRef.current?.close();
      }
      setConversationId(id);
      const history = await api.getChatHistory(id);
      if (history.messages.length) {
        setMessages(history.messages);
      }
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Could not start chat.",
      );
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;

    const payload = {
      message,
      sender_type: "customer",
      context: chatContext,
    } as const;

    try {
      let activeConversationId = conversationId;

      if (!activeConversationId) {
        activeConversationId = await api.startChat(activeProduct ?? undefined);
        setConversationId(activeConversationId);
      }

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
  JSON.stringify({
    ...payload,
    identity_token: customerProfile
      ? null
      : localStorage.getItem("furniture_identity_token"),
  }),
);
      } else {
        const response = await api.sendChatMessage(
          activeConversationId,
          payload,
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
    if (!selectedAdminChat || !content) return;

    try {
      const reply = await api.adminReply(selectedAdminChat.id, content);
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
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : "Could not send admin reply.",
      );
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
      const id = await api.startChat(activeProduct ?? undefined, true);
      setConversationId(id);
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
    const totalShipping = cart.reduce((total, item) => total + (item.shippingPrice || 0), 0);

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
      window.location.hash = "#track";
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
      window.location.hash = "#orders";
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
      window.location.hash = "#orders";
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
          window.location.hash = "#login";
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
    window.location.hash = "#catalog";
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
            <a className="brand" href="#catalog">
              Home Style            </a>
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
          <a className="brand" href="#catalog">
            Home Style          </a>
          <nav aria-label="Auth navigation">
            <a href="#catalog">Catalog</a>
            <a href="#login">Login</a>
            <a href="#register">Register</a>
          </nav>
        </header>
        <section className="auth-section">
          <form
            className="admin-card login-card"
            onSubmit={isRegister ? submitCustomerRegister : submitCustomerLogin}
          >
            <p className="eyebrow">
              {isRegister ? "إنشاء حساب" : "تسجيل دخول العميل"}
            </p>
            <h1>{isRegister ? "تسجيل" : "دخول"}</h1>
            {isRegister && (
              <>
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="الاسم الكامل"
                  required
                />
                <input
                  value={authPhone}
                  onChange={(event) => setAuthPhone(event.target.value)}
                  placeholder="رقم الهاتف"
                  required
                />
              </>
            )}
            <input
              type="email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="البريد الإلكتروني"
              required
            />
            <input
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="كلمة المرور"
              required
            />
            <button
              type="submit"
              className="panel-primary"
              disabled={authLoading}
            >
              {authLoading
                ? "يرجى الانتظار..."
                : isRegister
                  ? "إنشاء حساب"
                  : "دخول"}
            </button>
            {authError && <p className="inline-error">{authError}</p>}
            <a className="text-link" href={isRegister ? "#login" : "#register"}>
              {isRegister ? "لديك حساب بالفعل؟" : "إنشاء حساب جديد"}
            </a>
          </form>
        </section>
      </main>
    );
  }

  if (isAnalyticsRoute && hasAdminToken) {
    return (
      <AnalyticsDashboard onBack={() => { window.location.hash = '#catalog'; setHash('#catalog'); }} />
    );
  }

  if (isAdminRoute) {
    return (
      <main className="site-shell admin-shell">
        <header className="nav-bar">
          <a className="brand" href="#catalog">
            Home Style          </a>
          <nav aria-label="Admin navigation">
            <a href="#catalog">Storefront</a>
            <a href="#admin">Admin Panel</a>
            <a href="#analytics">لوحة التحليلات</a>
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

        <section className="admin-panel">
          <div className="admin-heading">
            <p className="eyebrow">لوحة الإدارة</p>
            <h1>التحكم في خدمة العملاء</h1>
            <p>
              إدارة الردود التلقائية، وضع المراجعة البشرية، والمفتاح العام لخدمة العملاء.
            </p>
          </div>

          {!hasAdminToken ? (
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
          ) : (
            <div className="admin-grid">
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
                      {money(dashboardStats?.pending_commissions)}
                    </strong>
                    عمولة معلقة
                  </span>
                </div>
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
                            <p
                              className={`message ${getMessageSender(message)}`}
                              key={message.id}
                            >
                              {message.content}
                            </p>
                          ))}
                        </div>
                        <form
                          className="admin-reply-form"
                          onSubmit={sendAdminReply}
                        >
                          <input
                            value={adminReplyDraft}
                            onChange={(event) =>
                              setAdminReplyDraft(event.target.value)
                            }
                            placeholder="اكتب رداً يدوياً..."
                          />
                          <button type="submit">رد</button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </section>
            </div>
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
    <main className="site-shell">
      <header className="nav-bar">
        <a className="brand" href="/">
          Home Style        </a>
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
          <a
            href="#catalog"
            className={mainTab === "catalog" ? "active" : ""}
            onClick={() => setMobileMenuOpen(false)}
          >
            الكتالوج
          </a>
          <a
            href="#details"
            className={mainTab === "details" ? "active" : ""}
            onClick={() => setMobileMenuOpen(false)}
          >
            تفاصيل
          </a>
          <a
            href="#checkout"
            className={mainTab === "checkout" ? "active" : ""}
            onClick={() => setMobileMenuOpen(false)}
          >
            الدفع
          </a>
          <a
            href="#orders"
            className={mainTab === "orders" ? "active" : ""}
            onClick={() => setMobileMenuOpen(false)}
          >
            طلباتي
          </a>
          <a
            href="#track"
            className={mainTab === "track" ? "active" : ""}
            onClick={() => setMobileMenuOpen(false)}
          >
            تتبع الطلب
          </a>
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
          {customerProfile ? (
            <a href="#logout" onClick={() => setMobileMenuOpen(false)}>
              تسجيل الخروج
            </a>
          ) : (
            <a href="#login" onClick={() => setMobileMenuOpen(false)}>
              تسجيل الدخول
            </a>
          )}
          {hasAdminToken && (
            <>
              <a href="#admin" onClick={() => setMobileMenuOpen(false)}>
                الإدارة
              </a>
              <a href="#analytics" onClick={() => setMobileMenuOpen(false)}>
                لوحة التحليلات
              </a>
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
                    window.location.hash = '#catalog';
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
                  window.location.hash = '#catalog';
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
              aria-label="Contact us"
              className={`nav-contact-btn ${contactDropdownOpen ? "active" : ""}`}
            >
              <span className="contact-text">تواصل معنا</span>
              <MessageCircle size={16} />
            </button>
            {contactDropdownOpen && (
              <div className="contact-dropdown">
                <a
                  href="https://wa.me/201503466584"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg width="16" height="16" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", marginLeft: "8px" }}>
                    <circle cx="30" cy="30" r="30" fill="#25D366"/>
                    <path fill="#FFFFFF" d="M30 14c-9.4 0-17 7.6-17 17 0 3 .8 5.9 2.3 8.5L13 46l6.7-2.2c2.5 1.4 5.3 2.1 8.3 2.1 9.4 0 17-7.6 17-17s-7.6-17-17-17zm0 31c-2.7 0-5.3-.7-7.6-2.1l-.5-.3-4 1.3 1.3-3.9-.3-.5C17.6 37.1 17 34.6 17 32c0-7.2 5.8-13 13-13s13 5.8 13 13-5.8 13-13 13zm7.1-9.7c-.4-.2-2.3-1.1-2.6-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.3 1.5-.2.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-.9-2.2-1.3-3-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.4 1.4-1.4 3.4s1.5 3.9 1.7 4.2c.2.3 3 4.5 7.2 6.3 1 .4 1.8.7 2.4.9 1 .3 1.9.3 2.7.2.8-.1 2.3-1 2.7-1.9.3-.9.3-1.7.2-1.9-.1-.2-.3-.3-.7-.5z"/>
                  </svg>
                  <span>واتساب</span>
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61591355288049"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg width="16" height="16" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", marginLeft: "8px" }}>
                    <circle cx="30" cy="30" r="30" fill="#1877F2"/>
                    <path fill="#FFFFFF" d="M33.5 31.5h4l.6-4.5h-4.6v-2.9c0-1.3.4-2.2 2.2-2.2h2.4V17.4c-.4-.1-1.9-.2-3.5-.2-3.5 0-5.9 2.1-5.9 6v3.3H25v4.5h3.7V43h5V31.5z"/>
                  </svg>
                  <span>فيسبوك</span>
                </a>
              </div>
            )}
          </div>
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
                const product = products.find(p => p.id === fav.product);
                if (!product) return null;
                const image = resolveAssetUrl(getImageUrl(product.images));
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
            <a className="primary-link" href="#catalog">
              تصفح الكتالوج
            </a>
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
              background: filtersOpen ? "var(--gold)" : "rgba(255,255,255,0.05)",
              color: filtersOpen ? "#17130f" : "var(--cream)",
              border: "1px solid var(--line)",
              fontFamily: "var(--sans)",
              fontSize: "14px",
              fontWeight: 600,
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
                      size={24}
                      fill={favorites.has(product.id) ? "#e74c3c" : "none"}
                      color={favorites.has(product.id) ? "#e74c3c" : "#F1EFE8"}
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
                        تواصل معنا
                      </button>
                    </div>

                    <button
                      type="button"
                      className="outline-btn whatsapp-outline-btn"
                      onClick={() => {
                        const message = `مرحباً، أريد طلب هذا المنتج:\n\n${product.title}\n\nالسعر: ${money(product.final_price)}\n\nالرابط: ${window.location.href}#catalog`;
                        const whatsappUrl = `https://wa.me/201503466584?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      style={{ width: "100%", minHeight: "44px" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="30" cy="30" r="30" fill="#25D366"/>
                        <path fill="#FFFFFF" d="M30 14c-9.4 0-17 7.6-17 17 0 3 .8 5.9 2.3 8.5L13 46l6.7-2.2c2.5 1.4 5.3 2.1 8.3 2.1 9.4 0 17-7.6 17-17s-7.6-17-17-17zm0 31c-2.7 0-5.3-.7-7.6-2.1l-.5-.3-4 1.3 1.3-3.9-.3-.5C17.6 37.1 17 34.6 17 32c0-7.2 5.8-13 13-13s13 5.8 13 13-5.8 13-13 13zm7.1-9.7c-.4-.2-2.3-1.1-2.6-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.3 1.5-.2.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-.9-2.2-1.3-3-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.4 1.4-1.4 3.4s1.5 3.9 1.7 4.2c.2.3 3 4.5 7.2 6.3 1 .4 1.8.7 2.4.9 1 .3 1.9.3 2.7.2.8-.1 2.3-1 2.7-1.9.3-.9.3-1.7.2-1.9-.1-.2-.3-.3-.7-.5z"/>
                      </svg>
                      طلب عبر واتساب
                    </button>

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
              const maxVisible = 5;
              if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                let start = Math.max(1, currentPage - 2);
                let end = Math.min(totalPages, currentPage + 2);
                if (start === 1) {
                  end = 5;
                } else if (end === totalPages) {
                  start = totalPages - 4;
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
                    background: currentPage === pageNum ? "var(--gold)" : "transparent",
                    color: currentPage === pageNum ? "#17130f" : "var(--cream)",
                    border: currentPage === pageNum ? "1px solid var(--gold)" : "1px solid var(--line)",
                    cursor: "pointer",
                    fontWeight: "bold",
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
        {!activeProduct && (
          <div className="details-empty-state">
            <p className="eyebrow">تفاصيل المنتج</p>
            <h2>اختر منتجًا من الكتالوج</h2>
            <p className="muted">
              اضغط "التفاصيل" على أي قطعة في الكتالوج عشان تشوف صورها
              ومواصفاتها وخيارات الشحن كاملة هنا.
            </p>
            <a className="primary-link" href="#catalog">
              تصفح الكتالوج
            </a>
          </div>
        )}
        {activeProduct &&
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
                      color={favorites.has(activeProduct.id) ? "#e74c3c" : "#F1EFE8"}
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
                    onClick={() => {
                      const message = `مرحباً، أريد طلب هذا المنتج:\n\n${activeProduct.title}\n\nالسعر: ${money(activeProduct.final_price)}\n\nالرابط: ${window.location.href}`;
                      const whatsappUrl = `https://wa.me/201503466584?text=${encodeURIComponent(message)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="30" cy="30" r="30" fill="#25D366"/>
                      <path fill="#FFFFFF" d="M30 14c-9.4 0-17 7.6-17 17 0 3 .8 5.9 2.3 8.5L13 46l6.7-2.2c2.5 1.4 5.3 2.1 8.3 2.1 9.4 0 17-7.6 17-17s-7.6-17-17-17zm0 31c-2.7 0-5.3-.7-7.6-2.1l-.5-.3-4 1.3 1.3-3.9-.3-.5C17.6 37.1 17 34.6 17 32c0-7.2 5.8-13 13-13s13 5.8 13 13-5.8 13-13 13zm7.1-9.7c-.4-.2-2.3-1.1-2.6-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.3 1.5-.2.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-.9-2.2-1.3-3-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.4 1.4-1.4 3.4s1.5 3.9 1.7 4.2c.2.3 3 4.5 7.2 6.3 1 .4 1.8.7 2.4.9 1 .3 1.9.3 2.7.2.8-.1 2.3-1 2.7-1.9.3-.9.3-1.7.2-1.9-.1-.2-.3-.3-.7-.5z"/>
                    </svg>
                    طلب عبر واتساب
                  </button>
                </div>
              </div>
            </section>
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
          onClick={() => setCheckoutOpen(true)}
        >
          فتح صفحة الدفع
        </button>
        {cart.length > 0 && (
          <div className="checkout-cart-display">
            <h3>سلتك</h3>
            <div className="checkout-cart-list">
              {cart.map((item) => (
                <div className="checkout-cart-item" key={item.product.id}>
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
                        <span className="shipping-price">{money(item.shippingPrice)}</span>
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

      <button
        className="chat-launcher"
        type="button"
        onClick={() => openContextChat(activeProduct ?? undefined)}
        aria-label="Open customer service chat"
      >
        <MessageCircle size={24} />
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
                  <div className="cart-row" key={item.product.id}>
                    <div>
                    <strong>{item.product.title}</strong>
                    {item.selectedVariant && <small className="variant-badge">{item.selectedVariant.size_name}</small>}
                    <span>{money(itemUnitPrice(item))}</span>
                    {item.selectedLocation && (
                      <small className="shipping-info">
                        الشحن إلى: {item.selectedLocation} ({money(item.shippingPrice)})
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
                    setCheckoutOpen(true);
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
                      `• ${item.product.title} - الكمية: ${item.quantity} - ${money(item.product.final_price * item.quantity)}`
                    ).join('\n');
                    const message = `مرحباً، أريد إنشاء طلب جديد:\n\n${orderMessage}\n\nالمجموع: ${money(grandTotal)}\nالشحن: ${money(totalShipping)}\nالإجمالي: ${money(grandTotal + totalShipping)}`;
                    const whatsappUrl = `https://wa.me/201503466584?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="30" cy="30" r="30" fill="#25D366"/>
                    <path fill="#FFFFFF" d="M30 14c-9.4 0-17 7.6-17 17 0 3 .8 5.9 2.3 8.5L13 46l6.7-2.2c2.5 1.4 5.3 2.1 8.3 2.1 9.4 0 17-7.6 17-17s-7.6-17-17-17zm0 31c-2.7 0-5.3-.7-7.6-2.1l-.5-.3-4 1.3 1.3-3.9-.3-.5C17.6 37.1 17 34.6 17 32c0-7.2 5.8-13 13-13s13 5.8 13 13-5.8 13-13 13zm7.1-9.7c-.4-.2-2.3-1.1-2.6-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.3 1.5-.2.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-.9-2.2-1.3-3-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.4 1.4-1.4 3.4s1.5 3.9 1.7 4.2c.2.3 3 4.5 7.2 6.3 1 .4 1.8.7 2.4.9 1 .3 1.9.3 2.7.2.8-.1 2.3-1 2.7-1.9.3-.9.3-1.7.2-1.9-.1-.2-.3-.3-.7-.5z"/>
                  </svg>
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
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="اسأل عن هذا المنتج..."
              aria-label="Chat message"
            />
            <button type="submit" aria-label="Send message">
              <Send size={18} />
            </button>
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
  );
}

export default App;