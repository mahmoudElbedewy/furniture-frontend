import re

with open('d:/furniture-frontend/src/App.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Append new styles
new_css = """
/* Admin Dashboard Sidebar Redesign */
.admin-dashboard-layout {
  display: flex;
  padding: 0;
  min-height: calc(100svh - 76px);
  background: var(--panel);
}

.admin-login-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 40px 18px;
}

.admin-sidebar {
  width: 280px;
  background: var(--bg);
  border-left: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 24px 0;
  flex-shrink: 0;
}

.admin-sidebar-header {
  padding: 0 24px 24px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 16px;
}

.admin-sidebar-header h2 {
  margin: 0;
  font-family: var(--serif);
  font-size: 24px;
  color: var(--cream);
}

.admin-sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 16px;
}

.admin-sidebar-nav button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: transparent;
  color: var(--muted);
  border: none;
  border-radius: var(--radius-btn);
  font-size: 15px;
  font-weight: 500;
  text-align: right;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-sidebar-nav button:hover {
  background: rgba(0, 0, 0, 0.03);
  color: var(--cream);
}

.admin-sidebar-nav button.active {
  background: var(--line);
  color: var(--cream);
}

.admin-main-content {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
  min-width: 0;
}

.admin-tab-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fadeIn 0.3s ease-out;
}

.admin-agent-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .admin-dashboard-layout {
    flex-direction: column;
  }
  .admin-sidebar {
    width: 100%;
    border-left: none;
    border-bottom: 1px solid var(--line);
    padding: 16px 0;
  }
  .admin-sidebar-header {
    padding: 0 16px 16px;
  }
  .admin-sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 0 16px;
    gap: 8px;
    white-space: nowrap;
  }
  .admin-sidebar-nav button {
    padding: 10px 14px;
    font-size: 14px;
  }
  .admin-main-content {
    padding: 24px 16px;
  }
}
"""

if '.admin-dashboard-layout' not in content:
    content += new_css

with open('d:/furniture-frontend/src/App.css', 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully added CSS to App.css')
