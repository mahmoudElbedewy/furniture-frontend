import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, ShoppingBag, Receipt, Package } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("furniture_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchJson = async <T,>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
};

const money = (value?: string | number | null) => {
  const numeric = Number(value ?? 0);
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    Number.isFinite(numeric) ? numeric : 0,
  )} ج.م`;
};

type SalesData = {
  totalRevenue: number;
  revenueTrend: number;
  ordersCount: number;
  ordersCountTrend: number;
  aov: number;
  aovTrend: number;
  ordersByStatus: { status: string; label: string; count: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  byGovernorate: {
    governorate: string;
    ordersCount: number;
    totalRevenue: number;
    avgShipping: number;
  }[];
  depositStats: {
    depositOrdersRate: number;
    cancelledWithDepositRate: number;
    note: string;
  };
  missingData: { key: string; label: string; reason: string }[];
};

type FunnelStep = {
  key: string;
  label: string;
  count: number;
  stepConversionRate: number;
};

type FunnelData = {
  steps: FunnelStep[];
  overallConversionRate: number;
  overallConversionTrend: number;
  missingData: { key: string; label: string; reason: string }[];
};

const KpiCard = ({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: number;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: 20,
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-card)",
      background: "var(--bg)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
      {icon}
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
    <strong style={{ fontSize: 24 }}>{value}</strong>
    {typeof trend === "number" && (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          color: trend >= 0 ? "#16a34a" : "#dc2626",
        }}
      >
        {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {Math.abs(trend)}%
      </span>
    )}
  </div>
);

export default function SalesTab() {
  const [sales, setSales] = useState<SalesData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [salesData, funnelData] = await Promise.all([
          fetchJson<SalesData>("/api/admin/analytics/sales/"),
          fetchJson<FunnelData>("/api/admin/analytics/sales/funnel/"),
        ]);
        if (!cancelled) {
          setSales(salesData);
          setFunnel(funnelData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "تعذر تحميل بيانات المبيعات");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="muted">جاري تحميل تحليلات المبيعات...</p>;
  if (error) return <p className="inline-error">{error}</p>;
  if (!sales || !funnel) return null;

  const cancelledStatus = sales.ordersByStatus.find((s) => s.status === "cancelled");

  return (
    <div className="admin-tab-content">
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        <KpiCard
          icon={<Receipt size={16} />}
          label="إجمالي الإيرادات"
          value={money(sales.totalRevenue)}
          trend={sales.revenueTrend}
        />
        <KpiCard
          icon={<ShoppingBag size={16} />}
          label="عدد الطلبات"
          value={String(sales.ordersCount)}
          trend={sales.ordersCountTrend}
        />
        <KpiCard
          icon={<Package size={16} />}
          label="متوسط قيمة الطلب"
          value={money(sales.aov)}
          trend={sales.aovTrend}
        />
        <KpiCard
          icon={<TrendingUp size={16} />}
          label="معدل التحويل الكلي"
          value={`${funnel.overallConversionRate}%`}
          trend={funnel.overallConversionTrend}
        />
      </section>

      <section className="admin-card">
        <h2>الإيرادات عبر الوقت</h2>
        {sales.dailyRevenue.length === 0 ? (
          <p className="muted">لا توجد بيانات إيرادات لهذه الفترة.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={sales.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#d3b16c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="admin-card">
        <h2>Funnel التحويل</h2>
        {funnel.missingData.length > 0 && funnel.steps.every((s) => s.count === 0) ? (
          <p className="muted">{funnel.missingData[0].reason}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {funnel.steps.map((step, idx) => {
              const widthPct = funnel.steps[0].count
                ? Math.max(6, (step.count / funnel.steps[0].count) * 100)
                : 0;
              return (
                <div key={step.key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    <span>{step.label}</span>
                    <span>
                      {step.count}
                      {idx > 0 && (
                        <span style={{ color: "var(--muted)" }}>
                          {" "}
                          ({step.stepConversionRate}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 22,
                      borderRadius: 6,
                      background: "var(--panel)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${widthPct}%`,
                        height: "100%",
                        background: "var(--gold, #d3b16c)",
                        transition: "width 300ms ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2>توزيع الطلبات حسب المحافظة</h2>
        {sales.byGovernorate.length === 0 ? (
          <p className="muted">لا توجد طلبات مسجلة بمحافظات بعد.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "right", color: "var(--muted)" }}>
                <th style={{ padding: 8 }}>المحافظة</th>
                <th style={{ padding: 8 }}>عدد الطلبات</th>
                <th style={{ padding: 8 }}>الإيرادات</th>
                <th style={{ padding: 8 }}>متوسط الشحن</th>
              </tr>
            </thead>
            <tbody>
              {sales.byGovernorate.map((row) => (
                <tr key={row.governorate} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: 8 }}>{row.governorate}</td>
                  <td style={{ padding: 8 }}>{row.ordersCount}</td>
                  <td style={{ padding: 8 }}>{money(row.totalRevenue)}</td>
                  <td style={{ padding: 8 }}>{money(row.avgShipping)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-card">
        <h2>أسباب إلغاء الطلبات</h2>
        <p className="admin-note">
          {sales.depositStats.note} حاليًا نعرض فقط عدد الطلبات الملغاة الكلي والنسبة
          التقريبية المرتبطة بالديبوزيت، إلى أن يُضاف حقل سبب إلغاء صريح في نموذج الطلب.
        </p>
        <div className="commission-row" style={{ gridTemplateColumns: "1fr auto" }}>
          <span>إجمالي الطلبات الملغاة في هذه الفترة</span>
          <strong>{cancelledStatus?.count ?? 0}</strong>
        </div>
        <div className="commission-row" style={{ gridTemplateColumns: "1fr auto" }}>
          <span>نسبة الملغاة المرتبطة بديبوزيت</span>
          <strong>{sales.depositStats.cancelledWithDepositRate}%</strong>
        </div>
      </section>
    </div>
  );
}
