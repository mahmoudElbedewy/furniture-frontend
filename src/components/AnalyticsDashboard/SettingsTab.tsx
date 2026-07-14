import { useEffect, useState } from 'react';
import {
  Settings, Link2, Unlink, Moon, Sun,
  ToggleLeft, ToggleRight, RefreshCw,
  Shield, Mail, User, Save,
} from 'lucide-react';
import { fetchAnalyticsSettings, updateAnalyticsSettings, type AnalyticsSettingsData } from './api';

export default function SettingsTab() {
  const [data, setData] = useState<AnalyticsSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  // Editable fields
  const [fbUrl, setFbUrl] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  const [fbFollowers, setFbFollowers] = useState(0);
  const [fbReach, setFbReach] = useState(0);
  const [igUrl, setIgUrl] = useState('');
  const [igFollowers, setIgFollowers] = useState(0);
  const [metaConnected, setMetaConnected] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    fetchAnalyticsSettings()
      .then((d) => {
        setData(d);
        setFbUrl(d.fb_page_url);
        setFbPageId(d.fb_page_id);
        setFbFollowers(d.fb_followers_override);
        setFbReach(d.fb_reach_override);
        setIgUrl(d.ig_page_url);
        setIgFollowers(d.ig_followers_override);
        setMetaConnected(d.is_meta_connected);
        setGoogleConnected(d.is_google_connected);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      await updateAnalyticsSettings({
        fb_page_url: fbUrl,
        fb_page_id: fbPageId,
        fb_followers_override: fbFollowers,
        fb_reach_override: fbReach,
        ig_page_url: igUrl,
        ig_followers_override: igFollowers,
        is_meta_connected: metaConnected,
        is_google_connected: googleConnected,
      });
      setSuccess('تم تحديث الإعدادات بنجاح ✅');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      <span className="mr-3 text-slate-400">جاري تحميل الإعدادات...</span>
    </div>
  );
  if (error && !data) return <p className="py-12 text-center text-red-400">خطأ: {error}</p>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Settings className="w-7 h-7 text-indigo-400" />
            الإعدادات والتكامل
          </h2>
          <p className="text-slate-400 text-sm mt-1">تحكم في ربط حساباتك وإعدادات لوحة التحليلات</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-600 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </button>
      </div>

      {/* Success/Error messages */}
      {success && <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">{success}</div>}
      {error && data && <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>}

      {/* Integration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meta / Facebook */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(244,114,182,0.15), rgba(251,146,60,0.1))', border: '1px solid rgba(244,114,182,0.2)' }}>
                {metaConnected ? <Link2 className="w-5 h-5 text-pink-400" /> : <Unlink className="w-5 h-5 text-red-400" />}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">Meta Graph API</h3>
                <p className="text-xs text-slate-400 mt-0.5">Facebook & Instagram</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${metaConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-xs font-medium ${metaConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                {metaConnected ? 'متصل' : 'غير متصل'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">رابط صفحة الفيسبوك</label>
              <input type="text" value={fbUrl} onChange={(e) => setFbUrl(e.target.value)}
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Page ID</label>
              <input type="text" value={fbPageId} onChange={(e) => setFbPageId(e.target.value)}
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">المتابعين (يدوي)</label>
                <input type="number" value={fbFollowers} onChange={(e) => setFbFollowers(Number(e.target.value))}
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">الوصول (يدوي)</label>
                <input type="number" value={fbReach} onChange={(e) => setFbReach(Number(e.target.value))}
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>يتم جلب المتابعين تلقائياً من فيسبوك</span>
            </div>
            <button type="button" onClick={() => setMetaConnected(!metaConnected)} className="focus:outline-none">
              {metaConnected
                ? <ToggleRight className="w-10 h-10 text-indigo-400" />
                : <ToggleLeft className="w-10 h-10 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Google Analytics */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}>
                {googleConnected ? <Link2 className="w-5 h-5 text-indigo-400" /> : <Unlink className="w-5 h-5 text-red-400" />}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">Google Analytics / Pixel</h3>
                <p className="text-xs text-slate-400 mt-0.5">تتبع الويب والتحويلات</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${googleConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-xs font-medium ${googleConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                {googleConnected ? 'متصل' : 'غير متصل'}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            يمكنك تتبع زيارات الموقع ومعدل الارتداد ومدة الجلسة ومعدل التحويل من خلال Google Analytics 4.
          </p>

          {/* Instagram fields */}
          <div className="space-y-3 border-t border-white/[0.06] pt-4 mt-4">
            <h4 className="text-sm font-medium text-slate-300">إعدادات إنستجرام</h4>
            <div>
              <label className="text-xs text-slate-400 block mb-1">رابط صفحة الإنستجرام</label>
              <input type="text" value={igUrl} onChange={(e) => setIgUrl(e.target.value)}
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">المتابعين (يدوي)</label>
              <input type="number" value={igFollowers} onChange={(e) => setIgFollowers(Number(e.target.value))}
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>آخر مزامنة: —</span>
            </div>
            <button type="button" onClick={() => setGoogleConnected(!googleConnected)} className="focus:outline-none">
              {googleConnected
                ? <ToggleRight className="w-10 h-10 text-indigo-400" />
                : <ToggleLeft className="w-10 h-10 text-slate-500" />}
            </button>
          </div>
        </div>
      </div>

      {/* Theme Switcher */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          {darkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
          تفضيلات العرض
        </h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Sun className={`w-5 h-5 transition-colors duration-300 ${!darkMode ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className={`text-sm font-medium transition-colors duration-300 ${!darkMode ? 'text-slate-100' : 'text-slate-500'}`}>الوضع الفاتح</span>
            </div>
            <button type="button" onClick={() => setDarkMode(!darkMode)} className="focus:outline-none mx-3">
              {darkMode
                ? <ToggleRight className="w-10 h-10 text-indigo-400 transition-transform duration-300" />
                : <ToggleLeft className="w-10 h-10 text-slate-500 transition-transform duration-300" />}
            </button>
            <div className="flex items-center gap-3">
              <Moon className={`w-5 h-5 transition-colors duration-300 ${darkMode ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span className={`text-sm font-medium transition-colors duration-300 ${darkMode ? 'text-slate-100' : 'text-slate-500'}`}>الوضع الداكن</span>
            </div>
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">{darkMode ? 'الوضع الداكن مفعل' : 'الوضع الفاتح مفعل'}</span>
        </div>
      </div>

      {/* Account Info */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-md">
        <h3 className="text-lg font-semibold text-slate-100 mb-5 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-400" />
          معلومات الحساب
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #f472b6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
            {data?.admin_name?.charAt(0) || 'م'}
          </div>
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-lg font-semibold text-slate-100">{data?.admin_name || 'المسؤول'}</h4>
              <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Shield className="w-3 h-3 inline mr-1 -mt-0.5" />
                Admin
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-2"><Mail className="w-4 h-4" />{data?.admin_email || 'admin@homestyle.com'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
