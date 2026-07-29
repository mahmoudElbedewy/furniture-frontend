import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Newspaper, Globe, Settings, ChevronLeft,
  ChevronRight, Home, Menu, X, ShoppingBag, Package,
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

const navItems: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'sales', label: 'المبيعات', icon: ShoppingBag },
  { key: 'products', label: 'المنتجات', icon: Package },
  { key: 'metahub', label: 'Meta Hub', icon: Users },
  { key: 'content', label: 'Content', icon: Newspaper },
  { key: 'web', label: 'Web Analytics', icon: Globe },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function AnalyticsDashboard({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dateRange, setDateRange] = useDateRange();
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('analytics_theme') as Theme) || 'dark',
  );

  useEffect(() => {
    localStorage.setItem('analytics_theme', theme);
  }, [theme]);

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
              <ProductsTab dateRange={dateRange} />
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