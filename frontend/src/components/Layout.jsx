// components/Layout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  function toggleDark() {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark', !darkMode);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar
          onSidebarToggle={() => setCollapsed(!collapsed)}
          darkMode={darkMode}
          onDarkToggle={toggleDark}
        />
        <main className="flex-1 overflow-y-auto p-5 bg-[var(--bg)] relative">
          <Outlet />
          
          {/* Assistant FAB */}
          {location.pathname !== '/assistant' && (
            <button
              onClick={() => navigate('/assistant')}
              className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-[var(--accent)] text-white rounded-full flex items-center justify-center font-bold text-lg shadow-2xl shadow-[var(--accent)]/40 hover:scale-110 hover:bg-[var(--accent-hover)] transition-all duration-300 group"
            >
              AI
              {/* Ping Animation overlay */}
              <span className="absolute inset-0 rounded-full border-2 border-[var(--accent)] animate-ping opacity-75"></span>
              
              {/* Tooltip */}
              <span className="absolute -top-12 right-0 bg-[var(--card)] border border-[var(--border)] text-[var(--text)] text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                Ask Assistant
              </span>
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
