import { useState } from 'react';
import {
  LayoutDashboard, Users, Newspaper, Globe, Settings, ChevronLeft,
  ChevronRight, Home, Menu, X,
} from 'lucide-react';
import './AnalyticsDashboard.css';
import DateRangePicker from './DateRangePicker';
import { useDateRange } from './useDateRange';
import OverviewTab from './OverviewTab';
import MetaHubTab from './MetaHubTab';
import ContentTab from './ContentTab';
import WebAnalyticsTab from './WebAnalyticsTab';
import SettingsTab from './SettingsTab';

type TabKey = 'overview' | 'metahub' | 'content' | 'web' | 'settings';

const navItems: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
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

  const handleBack = () => (onBack ? onBack() : (window.location.hash = '#catalog'));

  return (
    <div className="analytics-dashboard" dir="ltr">
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
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </header>

        <div className="dashboard-content">
          {activeTab === 'overview' && <OverviewTab dateRange={dateRange} />}
          {activeTab === 'metahub' && <MetaHubTab />}
          {activeTab === 'content' && <ContentTab dateRange={dateRange} />}
          {activeTab === 'web' && <WebAnalyticsTab />}
          {activeTab === 'settings' && <SettingsTab />}
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