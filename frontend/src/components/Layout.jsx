// components/Layout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { FaRobot } from 'react-icons/fa';

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
              className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-gradient-to-tr from-[var(--accent)] to-[var(--accent2)] text-white rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] hover:scale-110 active:scale-95 transition-all duration-300 group"
            >
              <FaRobot size={26} className="animate-pulse" />
              {/* Double Ping Animation overlay for heavy highlight */}
              <span className="absolute inset-0 rounded-full border-4 border-cyan-400 animate-ping opacity-50"></span>
              <span className="absolute inset-0 rounded-full border border-purple-400 animate-ping opacity-25" style={{ animationDelay: '500ms' }}></span>
              
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
