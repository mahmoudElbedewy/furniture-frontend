import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Eye, ShoppingCart, TrendingUp, AlertTriangle, ExternalLink, Package, Heart } from "lucide-react";
import {
  fetchTopProducts,
  fetchCategoryPerformance,
  fetchUnderperformingProducts,
  fetchFavoritesAnalytics,
} from "./api";
import type {
  TopProductItem,
  CategoryPerformanceItem,
  UnderperformingProductItem,
  FavoriteAnalyticsItem,
  DateRangeParams,
} from "./api";

const money = (value?: string | number | null) => {
  const numeric = Number(value ?? 0);
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    Number.isFinite(numeric) ? numeric : 0,
  )} ج.م`;
};

const CATEGORY_COLORS = ["#d3b16c", "#6366f1", "#34d399", "#f472b6", "#fb923c", "#a855f7"];

export default function ProductsTab({ dateRange }: { dateRange?: DateRangeParams }) {
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryPerformanceItem[]>([]);
  const [underperforming, setUnderperforming] = useState<UnderperformingProductItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteAnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [topRes, catRes, underRes, favRes] = await Promise.all([
          fetchTopProducts(dateRange),
          fetchCategoryPerformance(dateRange),
          fetchUnderperformingProducts(dateRange),
          fetchFavoritesAnalytics(),
        ]);
        if (!cancelled) {
          setTopProducts(topRes.products || []);
          setCategories(catRes.categories || []);
          setUnderperforming(underRes.products || []);
          setFavorites(favRes.favorites || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "تعذر تحميل بيانات تحليلات المنتجات");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  if (loading) return <p className="muted">جاري تحميل تحليلات المنتجات...</p>;
  if (error) return <p className="inline-error">{error}</p>;

  return (
    <div className="admin-tab-content">
      {/* ─── Top 10 Products Table ─── */}
      <section className="admin-card">
        <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TrendingUp size={22} style={{ color: "var(--gold, #d3b16c)" }} />
            <h2 style={{ margin: 0 }}>أفضل 10 منتجات أداءً</h2>
          </div>
        </div>

        {topProducts.length === 0 ? (
          <p className="muted">لا توجد بيانات منتجات في هذه الفترة.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "right" }}>
              <thead>
                <tr style={{ color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "10px 8px" }}>المنتج</th>
                  <th style={{ padding: "10px 8px" }}>التصنيف</th>
                  <th style={{ padding: "10px 8px" }}>السعر</th>
                  <th style={{ padding: "10px 8px" }}>المشاهدات</th>
                  <th style={{ padding: "10px 8px" }}>إضافة للسلة</th>
                  <th style={{ padding: "10px 8px" }}>الطلبات</th>
                  <th style={{ padding: "10px 8px" }}>الإيرادات</th>
                  <th style={{ padding: "10px 8px" }}>معدل التحويل</th>
                  <th style={{ padding: "10px 8px" }}>رابط</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 8px", display: "flex", alignItems: "center", gap: 10 }}>
                      {p.primary_image ? (
                        <img
                          src={p.primary_image}
                          alt={p.title}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 6,
                            background: "var(--panel)",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Package size={18} style={{ color: "var(--muted)" }} />
                        </div>
                      )}
                      <span style={{ fontWeight: 600 }}>{p.title}</span>
                    </td>
                    <td style={{ padding: "12px 8px", color: "var(--muted)" }}>{p.category_name}</td>
                    <td style={{ padding: "12px 8px" }}>{money(p.price)}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Eye size={14} style={{ color: "var(--muted)" }} />
                        {p.views}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <ShoppingCart size={14} style={{ color: "var(--muted)" }} />
                        {p.cart_adds}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", fontWeight: 700 }}>{p.orders}</td>
                    <td style={{ padding: "12px 8px", fontWeight: 700, color: "var(--gold, #d3b16c)" }}>
                      {money(p.revenue)}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          background: p.conversion_rate >= 5 ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: p.conversion_rate >= 5 ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {p.conversion_rate}%
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <a
                        href={`/#products/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: "var(--gold, #d3b16c)",
                          textDecoration: "none",
                          fontSize: 12,
                        }}
                      >
                        معاينة <ExternalLink size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Category Performance Bar Chart ─── */}
      <section className="admin-card">
        <h2>أداء الفئات والتصنيفات</h2>
        {categories.length === 0 ? (
          <p className="muted">لا توجد أداء فئات مسجل لهذه الفترة.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categories}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {categories.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ─── Underperforming Products Section ─── */}
      <section className="admin-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={22} style={{ color: "#ef4444" }} />
          <h2 style={{ margin: 0 }}>منتجات بحاجة لاهتمام (فرص تحسين)</h2>
        </div>
        <p className="admin-note" style={{ marginBottom: 16 }}>
          هذه المنتجات تحصل على مشاهدات عالية وزيارات، ولكن معدل تحويل المبيعات منخفض. يُنصح بمراجعة السعر أو إتاحة صور وخامات أوضح.
        </p>

        {underperforming.length === 0 ? (
          <p className="muted">جميع المنتجات ذات المشاهدات تحقق معدلات تحويل ممتازة!</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {underperforming.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: 16,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-card)",
                  background: "var(--bg)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {p.primary_image ? (
                    <img
                      src={p.primary_image}
                      alt={p.title}
                      style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        background: "var(--panel)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Package size={20} style={{ color: "var(--muted)" }} />
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: 14, display: "block" }}>{p.title}</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.category_name} • {money(p.price)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)" }}>
                  <span>المشاهدات: <strong style={{ color: "var(--cream)" }}>{p.views}</strong></span>
                  <span>الطلبات: <strong style={{ color: "var(--cream)" }}>{p.orders}</strong></span>
                  <span>التحويل: <strong style={{ color: "#ef4444" }}>{p.conversion_rate}%</strong></span>
                </div>

                <p style={{ margin: 0, fontSize: 12, color: "#dc2626", background: "rgba(239, 68, 68, 0.08)", padding: 8, borderRadius: 6 }}>
                  💡 {p.reason}
                </p>

                <a
                  href={`/#products/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--gold, #d3b16c)",
                    fontWeight: 600,
                    textDecoration: "none",
                    alignSelf: "flex-end",
                    marginTop: 4,
                  }}
                >
                  معاينة المنتج بالمتجر <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Favorites Analytics Widget ─── */}
      <section className="admin-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Heart size={22} style={{ color: "#ef4444" }} />
          <h2 style={{ margin: 0 }}>الأكثر تفضيلاً (Favorites Analytics)</h2>
        </div>
        <p className="admin-note" style={{ marginBottom: 16 }}>
          المنتجات الأكثر إضافة للمفضلة لدى العملاء، مع نسبة تحويل المستخدمين الذين أضافوا المنتج للمفضلة ثم قاموا بشرائه لاحقاً.
        </p>

        {favorites.length === 0 ? (
          <p className="muted">لا توجد منتجات مضافة للمفضلة حالياً.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {favorites.map((p) => (
              <div
                key={p.product_id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: 16,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-card)",
                  background: "var(--bg)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {p.primary_image ? (
                    <img
                      src={p.primary_image}
                      alt={p.product_title}
                      style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        background: "var(--panel)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Package size={20} style={{ color: "var(--muted)" }} />
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: 14, display: "block" }}>{p.product_title}</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{money(p.product_price)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)" }}>
                  <span>مرات التفضيل: <strong style={{ color: "var(--cream)" }}>{p.favorites_count}</strong></span>
                  <span>المشترون منها: <strong style={{ color: "var(--cream)" }}>{p.converted_count}</strong></span>
                  <span>التحويل: <strong style={{ color: "#22c55e" }}>{p.conversion_rate}%</strong></span>
                </div>

                <a
                  href={`/#products/${p.product_slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--gold, #d3b16c)",
                    fontWeight: 600,
                    textDecoration: "none",
                    alignSelf: "flex-end",
                    marginTop: 4,
                  }}
                >
                  صفحة المنتج <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

