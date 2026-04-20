// components/Layout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

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
        <main className="flex-1 overflow-y-auto p-5 bg-[var(--bg)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
