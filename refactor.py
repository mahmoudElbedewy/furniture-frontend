import re

with open('d:/furniture-frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add activeAdminTab state
content = re.sub(
    r'(const \[adminError, setAdminError\] = useState\(""\);)',
    r'\1\n  const [activeAdminTab, setActiveAdminTab] = useState("dashboard");',
    content
)

# 2. Add imports if needed (Home, BarChart)
if 'Home' not in content:
    content = re.sub(
        r'import \{([^}]+)\} from "lucide-react";',
        r'import {\1, Home, BarChart} from "lucide-react";',
        content
    )

# 3. Restructure Admin Panel
old_admin_pattern = re.compile(
    r'<section className="admin-panel">.*?<div className="admin-heading">.*?</div>\s*'
    r'\{!hasAdminToken \? \(\s*<form className="admin-card login-card" onSubmit=\{submitAdminLogin\}>'
    r'(.*?)</form>\s*\) : \(\s*<div className="admin-grid">\s*'
    r'<section className="admin-card">\s*<div className="admin-card-title">\s*<Settings size=\{22\} />\s*<h2>وضع خدمة العملاء</h2>\s*</div>(.*?)'
    r'<section className="admin-card">\s*<h2>إحصائيات المتجر</h2>\s*<div className="admin-stats">(.*?)</div>\s*</section>\s*'
    r'<section className="admin-card">\s*<div className="admin-card-title">\s*<ImageUp size=\{22\} />\s*<h2>صور المنتج لخدمة العملاء</h2>(.*?)'
    r'<section className="admin-card admin-agent-card">(.*?)'
    r'<section className="admin-card admin-orders-card">(.*?)'
    r'<section className="admin-card admin-commissions-card">(.*?)'
    r'</div>\s*\)\}\s*</section>',
    re.DOTALL
)

def replace_admin(match):
    login_form_inner = match.group(1)
    agent_settings_inner = match.group(2)
    stats_inner = match.group(3)
    images_inner = match.group(4)
    agent_chat_inner = match.group(5)
    orders_inner = match.group(6)
    commissions_inner = match.group(7)

    return f"""<section className={{`admin-panel ${{hasAdminToken ? "admin-dashboard-layout" : ""}}`}}>
          {{!hasAdminToken ? (
            <div className="admin-login-wrapper">
              <div className="admin-heading">
                <p className="eyebrow">لوحة الإدارة</p>
                <h1>تسجيل الدخول</h1>
              </div>
              <form className="admin-card login-card" onSubmit={{submitAdminLogin}}>
{login_form_inner}</form>
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
                    className={{activeAdminTab === "dashboard" ? "active" : ""}} 
                    onClick={{() => setActiveAdminTab("dashboard")}}
                  >
                    <Home size={{18}} />
                    الرئيسية
                  </button>
                  <button 
                    type="button"
                    className={{activeAdminTab === "orders" ? "active" : ""}} 
                    onClick={{() => {{ setActiveAdminTab("orders"); loadAdminData(); }}}}
                  >
                    <ShoppingBag size={{18}} />
                    إدارة الطلبات
                  </button>
                  <button 
                    type="button"
                    className={{activeAdminTab === "commissions" ? "active" : ""}} 
                    onClick={{() => {{ setActiveAdminTab("commissions"); loadAdminData(); }}}}
                  >
                    <CheckCircle2 size={{18}} />
                    العمولات
                  </button>
                  <button 
                    type="button"
                    className={{activeAdminTab === "agent" ? "active" : ""}} 
                    onClick={{() => setActiveAdminTab("agent")}}
                  >
                    <MessageCircle size={{18}} />
                    خدمة العملاء AI
                  </button>
                  <button 
                    type="button"
                    className={{activeAdminTab === "analytics" ? "active" : ""}} 
                    onClick={{() => setActiveAdminTab("analytics")}}
                  >
                    <BarChart size={{18}} />
                    التحليلات
                  </button>
                </nav>
              </aside>
              <main className="admin-main-content">
                {{activeAdminTab === "dashboard" && (
                  <div className="admin-tab-content">
                    <section className="admin-card">
                      <h2>إحصائيات المتجر</h2>
                      <div className="admin-stats">
{stats_inner}                      </div>
                    </section>
                  </div>
                )}}
                {{activeAdminTab === "orders" && (
                  <div className="admin-tab-content">
                    <section className="admin-card admin-orders-card">
{orders_inner}                  </div>
                )}}
                {{activeAdminTab === "commissions" && (
                  <div className="admin-tab-content">
                    <section className="admin-card admin-commissions-card">
{commissions_inner}                  </div>
                )}}
                {{activeAdminTab === "agent" && (
                  <div className="admin-tab-content admin-agent-grid">
                    <section className="admin-card">
                      <div className="admin-card-title">
                        <Settings size={{22}} />
                        <h2>وضع خدمة العملاء</h2>
                      </div>
{agent_settings_inner}
                    <section className="admin-card">
                      <div className="admin-card-title">
                        <ImageUp size={{22}} />
                        <h2>صور المنتج لخدمة العملاء</h2>
{images_inner}
                    <section className="admin-card admin-agent-card">
{agent_chat_inner}                  </div>
                )}}
                {{activeAdminTab === "analytics" && (
                  <div className="admin-tab-content">
                    <AnalyticsDashboard onBack={{() => setActiveAdminTab("dashboard")}} />
                  </div>
                )}}
              </main>
            </>
          )}}
        </section>"""

new_content, count = old_admin_pattern.subn(replace_admin, content)
if count == 0:
    print('Failed to replace admin panel')
else:
    with open('d:/furniture-frontend/src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully restructured Admin Panel')
