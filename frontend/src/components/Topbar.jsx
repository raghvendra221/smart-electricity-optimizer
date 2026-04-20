// components/Topbar.jsx
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MdMenu, MdDarkMode, MdLightMode, MdNotifications } from 'react-icons/md';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/appliances': 'Appliance Management',
  '/usage':      'Usage Tracking',
  '/insights':   'Smart Insights',
};

export default function Topbar({ onSidebarToggle, darkMode, onDarkToggle }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const title = PAGE_TITLES[pathname] || 'Dashboard';

  return (
    <header className="h-14 flex items-center px-5 gap-3 bg-[var(--bg2)] border-b border-[var(--border)] shrink-0">
      <button
        onClick={onSidebarToggle}
        className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--accent)] hover:bg-[var(--bg3)] transition-colors"
      >
        <MdMenu size={20} />
      </button>

      <div className="flex-1">
        <h1 className="text-base font-semibold text-[var(--text)]">{title}</h1>
      </div>

      <div className="flex items-center gap-1 bg-[var(--bg3)] px-2.5 py-1 rounded-full border border-[var(--border)]">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="font-mono text-[10px] text-[var(--text3)]">Live</span>
      </div>

      <button
        onClick={() => addToast('Notifications coming soon!', 'info')}
        className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--accent)] hover:bg-[var(--bg3)] transition-colors"
      >
        <MdNotifications size={18} />
      </button>

      <button
        onClick={onDarkToggle}
        className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--accent)] hover:bg-[var(--bg3)] transition-colors"
        title="Toggle dark mode"
      >
        {darkMode ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
      </button>

      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer
          bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] text-gray-900"
        onClick={() => addToast(`Signed in as ${user?.email}`, 'info')}
        title={user?.email}
      >
        {user?.name?.[0]?.toUpperCase() || 'U'}
      </div>
    </header>
  );
}
