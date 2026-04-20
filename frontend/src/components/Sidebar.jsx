// components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { MdDashboard, MdDevices, MdShowChart, MdLightbulb, MdLogout } from 'react-icons/md';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: MdDashboard, label: 'Dashboard' },
  { to: '/appliances', icon: MdDevices,   label: 'Appliances' },
  { to: '/usage',      icon: MdShowChart, label: 'Usage' },
  { to: '/insights',   icon: MdLightbulb, label: 'Insights' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { logout, user } = useAuth();
  const { addToast } = useToast();

  function handleLogout() {
    logout();
    addToast('Logged out successfully', 'info');
  }

  return (
    <aside
      className={`flex flex-col shrink-0 transition-all duration-300 
        bg-[var(--bg2)] border-r border-[var(--border)]
        ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base
          bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)]">
          ⚡
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold text-[var(--text)] leading-tight">Smart Elec</div>
            <div className="text-[10px] font-mono text-[var(--text3)]">Optimizer</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 pt-3">
        {!collapsed && (
          <div className="text-[9px] font-mono text-[var(--text3)] uppercase tracking-widest px-3 mb-2">
            Menu
          </div>
        )}
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
              ${collapsed ? 'justify-center' : ''}
              ${isActive
                ? 'bg-gradient-to-r from-cyan-900/40 to-purple-900/30 text-[var(--accent)] border border-cyan-900/40'
                : 'text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-[var(--border)]">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)]
              flex items-center justify-center text-[10px] font-bold text-gray-900 shrink-0">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-xs text-[var(--text2)] truncate">{user.name}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full
            text-red-400 hover:bg-red-900/20 transition-colors
            ${collapsed ? 'justify-center' : ''}`}
        >
          <MdLogout size={18} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
