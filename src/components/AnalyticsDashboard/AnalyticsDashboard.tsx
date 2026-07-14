import { useState } from 'react';
import {
  LayoutDashboard, Globe, Share2, Settings, ChevronLeft,
  ChevronRight, Home, Menu, X, CalendarDays,
} from 'lucide-react';
import './AnalyticsDashboard.css';
import OverviewTab from './OverviewTab';
import WebAnalyticsTab from './WebAnalyticsTab';
import MetaHubTab from './MetaHubTab';
import SettingsTab from './SettingsTab';

type TabKey = 'overview' | 'web' | 'meta' | 'settings';

const navItems: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { key: 'web', label: 'تحليلات الويب', icon: Globe },
  { key: 'meta', label: 'مركز ميتا', icon: Share2 },
  { key: 'settings', label: 'الإعدادات', icon: Settings },
];

const tabTitles: Record<TabKey, string> = {
  overview: 'نظرة عامة',
  web: 'تحليلات الويب',
  meta: 'مركز ميتا',
  settings: 'الإعدادات والتكامل',
};

export default function AnalyticsDashboard({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (key: TabKey) => {
    setActiveTab(key);
    setMobileOpen(false);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.hash = '#catalog';
    }
  };

  return (
    <div className="analytics-dashboard" dir="rtl">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">HS</span>
            {!sidebarCollapsed && <span className="sidebar-logo-text">Home Style</span>}
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                onClick={() => handleNav(item.key)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          <button type="button" className="nav-item" onClick={handleBack} title={sidebarCollapsed ? 'العودة للمتجر' : undefined}>
            <Home size={20} />
            {!sidebarCollapsed && <span>العودة للمتجر</span>}
          </button>

          {!sidebarCollapsed && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">A</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">المسؤول</span>
                <span className="sidebar-user-role">admin</span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="sidebar-user" style={{ justifyContent: 'center' }}>
              <div className="sidebar-avatar">A</div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className={`dashboard-main ${sidebarCollapsed ? 'dashboard-main-expanded' : ''}`}>
        {/* Top bar */}
        <header className="dashboard-topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="dash-mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-bold text-slate-100">{tabTitles[activeTab]}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CalendarDays size={14} />
            <span>يناير ٢٠٢٦ – يوليو ٢٠٢٦</span>
          </div>
        </header>

        {/* Tab Content */}
        <div className="dashboard-content">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'web' && <WebAnalyticsTab />}
          {activeTab === 'meta' && <MetaHubTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>

      {/* Mobile close button for sidebar */}
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-close-mobile"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
      )}
    </div>
  );
}
