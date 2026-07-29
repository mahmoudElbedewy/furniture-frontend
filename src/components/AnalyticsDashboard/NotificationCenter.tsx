import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, CheckCheck, RefreshCw, AlertTriangle, Info, Zap, X } from "lucide-react";
import {
  fetchAlerts,
  markAlertRead,
  markAllAlertsRead,
  triggerAlerts,
  type AnalyticsAlertItem,
} from "./api";

// ─── severity helpers ──────────────────────────────────
const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.25)",
    badge: "#6366f1",
  },
  warning: {
    icon: AlertTriangle,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
    badge: "#f59e0b",
  },
  critical: {
    icon: Zap,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
    badge: "#ef4444",
  },
} as const;

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

// ─── Single alert row ──────────────────────────────────
function AlertRow({ alert, onRead }: { alert: AnalyticsAlertItem; onRead: (id: number) => void }) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  const Icon = cfg.icon;

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 14px",
        background: alert.is_read ? "transparent" : cfg.bg,
        borderLeft: `3px solid ${alert.is_read ? "transparent" : cfg.border}`,
        transition: "background 0.2s",
        cursor: "default",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
        }}
      >
        <Icon size={15} style={{ color: cfg.color }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: alert.is_read ? 400 : 600,
            color: "var(--cream, #f5f0e8)",
            lineHeight: 1.4,
          }}
        >
          {alert.message}
        </p>
        {alert.detail && (
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 11,
              color: "var(--muted, #8a8a8a)",
              lineHeight: 1.4,
            }}
          >
            {alert.detail}
          </p>
        )}
        <span style={{ fontSize: 11, color: "var(--muted, #8a8a8a)", display: "block", marginTop: 4 }}>
          {relativeTime(alert.created_at)}
        </span>
      </div>

      {!alert.is_read && (
        <button
          onClick={() => onRead(alert.id)}
          title="تعليم كمقروء"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: cfg.color,
            padding: 4,
            flexShrink: 0,
            alignSelf: "flex-start",
          }}
        >
          <Check size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Main NotificationCenter ───────────────────────────
export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AnalyticsAlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── close on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── poll unread count every 60s ──
  const loadUnreadCount = () => {
    fetchAlerts(true)
      .then((d) => setUnreadCount(d.unread_count))
      .catch(() => {});
  };
  useEffect(() => {
    loadUnreadCount();
    const t = setInterval(loadUnreadCount, 60_000);
    return () => clearInterval(t);
  }, []);

  // ── load full list when opened ──
  const openPanel = () => {
    setOpen(true);
    setLoading(true);
    fetchAlerts()
      .then((d) => {
        setAlerts(d.alerts);
        setUnreadCount(d.unread_count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleRead = (id: number) => {
    markAlertRead(id).catch(() => {});
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleReadAll = () => {
    markAllAlertsRead().catch(() => {});
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    setUnreadCount(0);
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await triggerAlerts();
      setTriggerMsg(res.message);
      // reload
      const d = await fetchAlerts();
      setAlerts(d.alerts);
      setUnreadCount(d.unread_count);
    } catch {
      setTriggerMsg("حدث خطأ أثناء تشغيل المحرك.");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div ref={dropRef} style={{ position: "relative" }}>
      {/* ── Bell Button ── */}
      <button
        onClick={open ? () => setOpen(false) : openPanel}
        className="notif-bell-btn"
        title="مركز التنبيهات"
        style={{
          position: "relative",
          background: "var(--panel, rgba(255,255,255,0.06))",
          border: "1px solid var(--line, rgba(255,255,255,0.08))",
          borderRadius: 10,
          width: 38,
          height: 38,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          color: unreadCount > 0 ? "#f59e0b" : "var(--muted, #8a8a8a)",
          transition: "all 0.2s",
        }}
      >
        {unreadCount > 0 ? <Bell size={18} /> : <BellOff size={18} />}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              borderRadius: "50%",
              width: 18,
              height: 18,
              display: "grid",
              placeItems: "center",
              lineHeight: 1,
              border: "2px solid var(--bg, #111)",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 360,
            maxHeight: 520,
            background: "var(--surface, #1a1a1a)",
            border: "1px solid var(--line, rgba(255,255,255,0.1))",
            borderRadius: 14,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "slideDownFade 0.18s ease",
          }}
        >
          {/* header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid var(--line, rgba(255,255,255,0.08))",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={16} style={{ color: "#f59e0b" }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--cream, #f5f0e8)" }}>
                التنبيهات
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 99,
                    padding: "1px 6px",
                  }}
                >
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleReadAll}
                  title="تعليم الكل كمقروء"
                  style={{
                    background: "none",
                    border: "1px solid var(--line, rgba(255,255,255,0.1))",
                    borderRadius: 7,
                    padding: "4px 8px",
                    cursor: "pointer",
                    color: "var(--muted, #8a8a8a)",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <CheckCheck size={12} /> الكل
                </button>
              )}
              <button
                onClick={handleTrigger}
                disabled={triggering}
                title="فحص التنبيهات الآن"
                style={{
                  background: "none",
                  border: "1px solid var(--line, rgba(255,255,255,0.1))",
                  borderRadius: 7,
                  padding: "4px 8px",
                  cursor: triggering ? "not-allowed" : "pointer",
                  color: "var(--muted, #8a8a8a)",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  opacity: triggering ? 0.6 : 1,
                }}
              >
                <RefreshCw size={12} className={triggering ? "spin" : ""} />
                فحص
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted, #8a8a8a)",
                  padding: 4,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* trigger message */}
          {triggerMsg && (
            <div
              style={{
                padding: "8px 14px",
                background: "rgba(99,102,241,0.1)",
                borderBottom: "1px solid rgba(99,102,241,0.2)",
                fontSize: 12,
                color: "#818cf8",
                flexShrink: 0,
              }}
            >
              ✓ {triggerMsg}
            </div>
          )}

          {/* body */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading ? (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: 120,
                  color: "var(--muted, #8a8a8a)",
                  fontSize: 13,
                }}
              >
                <RefreshCw size={20} className="spin" />
              </div>
            ) : alerts.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 120,
                  color: "var(--muted, #8a8a8a)",
                  fontSize: 13,
                }}
              >
                <BellOff size={24} />
                <span>لا توجد تنبيهات حالياً</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {alerts.map((a) => (
                  <AlertRow key={a.id} alert={a} onRead={handleRead} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
