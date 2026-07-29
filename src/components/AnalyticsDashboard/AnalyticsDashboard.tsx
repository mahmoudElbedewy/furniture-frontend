import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Newspaper, Globe, Settings, ChevronLeft,
  ChevronRight, Home, Menu, X, ShoppingBag, Package, Search,
  SlidersHorizontal, EyeOff, ArrowUp, ArrowDown, RotateCcw,
} from 'lucide-react';
import './AnalyticsDashboard.css';
import DateRangePicker from './DateRangePicker';
import { useDateRange } from './useDateRange';
import OverviewTab from './OverviewTab';
import SalesTab from './SalesTab';
import ProductsTab from './ProductsTab';
import MetaHubTab from './MetaHubTab';
import ContentTab from './ContentTab';
import WebAnalyticsTab from './WebAnalyticsTab';
import SettingsTab from './SettingsTab';
import ErrorBoundary from './ErrorBoundary';
import NotificationCenter from './NotificationCenter';

type TabKey = 'overview' | 'sales' | 'products' | 'metahub' | 'content' | 'web' | 'settings';
type Theme = 'dark' | 'light';

type WidgetPrefs = Record<string, { hidden: number[]; order: number[] }>;

type QuickProduct = {
  id: string;
  title: string;
  slug: string;
  final_price?: number;
  primary_image?: string | null;
  image_url?: string | null;
  category?: { name?: string } | string | null;
};

const navItems: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'sales', label: 'المبيعات', icon: ShoppingBag },
  { key: 'products', label: 'المنتجات', icon: Package },
  { key: 'metahub', label: 'Meta Hub', icon: Users },
  { key: 'content', label: 'Content', icon: Newspaper },
  { key: 'web', label: 'Web Analytics', icon: Globe },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const dataRangeKey = (range: { range: string; start?: string; end?: string; compareTo?: string }) =>
  `${range.range}:${range.start || ''}:${range.end || ''}:${range.compareTo || ''}`;

export default function AnalyticsDashboard({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dateRange, setDateRange] = useDateRange();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [widgetCount, setWidgetCount] = useState(0);
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPrefs>(() => {
    try {
      return JSON.parse(localStorage.getItem('analytics_widget_prefs') || '{}') as WidgetPrefs;
    } catch {
      return {};
    }
  });
  const [quickSearch, setQuickSearch] = useState('');
  const [quickResults, setQuickResults] = useState<QuickProduct[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [focusedProductSlug, setFocusedProductSlug] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('analytics_theme') as Theme) || 'dark',
  );

  useEffect(() => {
    localStorage.setItem('analytics_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('analytics_widget_prefs', JSON.stringify(widgetPrefs));
  }, [widgetPrefs]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const content = document.querySelector('.dashboard-content > * > *');
      const widgets = Array.from(content?.children || []) as HTMLElement[];
      const prefs = widgetPrefs[activeTab] || { hidden: [], order: [] };
      const order = prefs.order.length === widgets.length ? prefs.order : widgets.map((_, i) => i);
      setWidgetCount(widgets.length);
      widgets.forEach((node, idx) => {
        const orderedAt = order.indexOf(idx);
        node.dataset.widgetIndex = String(idx);
        node.style.order = String(orderedAt === -1 ? idx : orderedAt);
        node.classList.toggle('analytics-widget-hidden', prefs.hidden.includes(idx));
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [activeTab, widgetPrefs, dataRangeKey(dateRange)]);

  useEffect(() => {
    const query = quickSearch.trim();
    if (query.length < 2) {
      setQuickResults([]);
      setQuickLoading(false);
      return;
    }
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      setQuickLoading(true);
      try {
        const params = new URLSearchParams({ search: query, page_size: '5' });
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/products/?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('search failed');
        const payload = await res.json();
        setQuickResults(payload.results || payload.products || payload || []);
      } catch {
        if (!controller.signal.aborted) setQuickResults([]);
      } finally {
        if (!controller.signal.aborted) setQuickLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(id);
    };
  }, [quickSearch]);

  const activePrefs = widgetPrefs[activeTab] || { hidden: [], order: Array.from({ length: widgetCount }, (_, i) => i) };
  const activeOrder = activePrefs.order.length === widgetCount ? activePrefs.order : Array.from({ length: widgetCount }, (_, i) => i);

  const updateActivePrefs = (updater: (prefs: { hidden: number[]; order: number[] }) => { hidden: number[]; order: number[] }) => {
    setWidgetPrefs((prev) => ({
      ...prev,
      [activeTab]: updater({
        hidden: prev[activeTab]?.hidden || [],
        order: prev[activeTab]?.order.length === widgetCount ? prev[activeTab].order : Array.from({ length: widgetCount }, (_, i) => i),
      }),
    }));
  };

  const moveWidget = (visiblePosition: number, direction: -1 | 1) => {
    const nextPosition = visiblePosition + direction;
    if (nextPosition < 0 || nextPosition >= activeOrder.length) return;
    updateActivePrefs((prefs) => {
      const order = [...prefs.order];
      [order[visiblePosition], order[nextPosition]] = [order[nextPosition], order[visiblePosition]];
      return { ...prefs, order };
    });
  };

  const toggleWidget = (idx: number) => {
    updateActivePrefs((prefs) => ({
      ...prefs,
      hidden: prefs.hidden.includes(idx) ? prefs.hidden.filter((item) => item !== idx) : [...prefs.hidden, idx],
    }));
  };

  const resetWidgets = () => {
    setWidgetPrefs((prev) => {
      const next = { ...prev };
      delete next[activeTab];
      return next;
    });
  };

  const handleQuickSelect = (product: QuickProduct) => {
    setFocusedProductSlug(product.slug);
    setActiveTab('products');
    setQuickSearch('');
    setQuickResults([]);
  };

  const handleBack = () => (onBack ? onBack() : (window.location.hash = '#catalog'));

  return (
    <div className={`analytics-dashboard ${theme === 'light' ? 'theme-light' : ''}`} dir="ltr">
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} role="presentation" />}

      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">HS</span>
            {!sidebarCollapsed && <span className="sidebar-logo-text">Analytics</span>}
          </div>
          <button type="button" className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button"
              className={`nav-item ${activeTab === key ? 'nav-item-active' : ''}`}
              onClick={() => { setActiveTab(key); setMobileOpen(false); }}
              title={sidebarCollapsed ? label : undefined}>
              <Icon size={20} />
              {!sidebarCollapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button type="button" className="nav-item" onClick={handleBack}>
            <Home size={20} />
            {!sidebarCollapsed && <span>Back to store</span>}
          </button>
        </div>
      </aside>

      <main className={`dashboard-main ${sidebarCollapsed ? 'dashboard-main-expanded' : ''}`}>
        <header className="dashboard-topbar">
          <div className="flex items-center gap-3">
            <button type="button" className="dash-mobile-menu-btn" onClick={() => setMobileOpen(true)}>
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-bold text-slate-100">
              {navItems.find((n) => n.key === activeTab)?.label}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="dashboard-quick-search">
              <Search size={16} />
              <input
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="بحث سريع"
              />
              {(quickSearch.trim().length >= 2 || quickResults.length > 0) && (
                <div className="dashboard-quick-results">
                  {quickLoading && <p>جاري البحث...</p>}
                  {!quickLoading && quickResults.length === 0 && <p>لا توجد نتائج</p>}
                  {!quickLoading && quickResults.map((product) => (
                    <button key={product.id || product.slug} type="button" onClick={() => handleQuickSelect(product)}>
                      <span>{product.title}</span>
                      <small>{typeof product.category === 'string' ? product.category : product.category?.name || 'منتج'}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="dashboard-widget-customizer">
              <button type="button" className="dash-icon-button" onClick={() => setCustomizerOpen((v) => !v)} title="تخصيص">
                <SlidersHorizontal size={18} />
              </button>
              {customizerOpen && (
                <div className="widget-customizer-menu">
                  <div className="widget-customizer-header">
                    <strong>تخصيص العرض</strong>
                    <button type="button" onClick={resetWidgets} title="إعادة ضبط"><RotateCcw size={14} /></button>
                  </div>
                  {widgetCount === 0 ? (
                    <p className="widget-customizer-empty">لا توجد عناصر قابلة للتخصيص</p>
                  ) : (
                    activeOrder.map((idx, position) => (
                      <div key={idx} className="widget-customizer-row">
                        <span>عنصر {idx + 1}</span>
                        <button type="button" onClick={() => moveWidget(position, -1)} title="أعلى"><ArrowUp size={14} /></button>
                        <button type="button" onClick={() => moveWidget(position, 1)} title="أسفل"><ArrowDown size={14} /></button>
                        <button
                          type="button"
                          className={activePrefs.hidden.includes(idx) ? 'is-muted' : ''}
                          onClick={() => toggleWidget(idx)}
                          title="إخفاء"
                        >
                          <EyeOff size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <NotificationCenter />
          </div>
        </header>

        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <ErrorBoundary tabLabel="Overview">
              <OverviewTab dateRange={dateRange} />
            </ErrorBoundary>
          )}
          {activeTab === 'sales' && (
            <ErrorBoundary tabLabel="Sales">
              <SalesTab />
            </ErrorBoundary>
          )}
          {activeTab === 'products' && (
            <ErrorBoundary tabLabel="Products">
              <ProductsTab dateRange={dateRange} focusedProductSlug={focusedProductSlug} />
            </ErrorBoundary>
          )}
          {activeTab === 'metahub' && (
            <ErrorBoundary tabLabel="Meta Hub">
              <MetaHubTab />
            </ErrorBoundary>
          )}
          {activeTab === 'content' && (
            <ErrorBoundary tabLabel="Content">
              <ContentTab dateRange={dateRange} />
            </ErrorBoundary>
          )}
          {activeTab === 'web' && (
            <ErrorBoundary tabLabel="Web Analytics">
              <WebAnalyticsTab dateRange={dateRange} />
            </ErrorBoundary>
          )}
          {activeTab === 'settings' && (
            <ErrorBoundary tabLabel="Settings">
              <SettingsTab theme={theme} onThemeChange={setTheme} />
            </ErrorBoundary>
          )}
        </div>
      </main>

      {mobileOpen && (
        <button type="button" className="sidebar-close-mobile" onClick={() => setMobileOpen(false)}>
          <X size={24} />
        </button>
      )}
    </div>
  );
}
