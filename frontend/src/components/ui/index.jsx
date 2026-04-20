// components/ui/index.jsx
import React from 'react';

export function Spinner({ size = 20 }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin inline-block"
    />
  );
}

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <Spinner size={28} />
      <p className="font-mono text-xs text-[var(--text3)]">{message}</p>
    </div>
  );
}

export function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-[var(--text)] font-medium">{title}</p>
      {subtitle && <p className="text-[var(--text3)] text-sm">{subtitle}</p>}
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub, delta, deltaType = 'up', accentColor = 'var(--accent)' }) {
  const deltaColors = {
    up: 'bg-green-900/30 text-green-400',
    down: 'bg-red-900/30 text-red-400',
    neutral: 'bg-cyan-900/20 text-cyan-400',
  };
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest mb-2">{label}</div>
      <div className="text-2xl font-bold font-mono leading-none" style={{ color: accentColor }}>{value}</div>
      {sub && <div className="text-xs text-[var(--text2)] mt-1">{sub}</div>}
      {delta && (
        <div className={`inline-flex items-center gap-1 text-[10px] mt-2 px-2 py-0.5 rounded-full ${deltaColors[deltaType]}`}>
          {deltaType === 'up' ? '▲' : deltaType === 'down' ? '▼' : '●'} {delta}
        </div>
      )}
    </div>
  );
}

export function Card({ children, className = '', title }) {
  return (
    <div className={`bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 ${className}`}>
      {title && <h3 className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest mb-3">{title}</h3>}
      {children}
    </div>
  );
}

export function Badge({ children, variant = 'cyan' }) {
  const variants = {
    cyan:   'bg-cyan-900/30 text-cyan-400 border border-cyan-800/40',
    purple: 'bg-purple-900/30 text-purple-400 border border-purple-800/40',
    amber:  'bg-amber-900/30 text-amber-400 border border-amber-800/40',
    green:  'bg-green-900/30 text-green-400 border border-green-800/40',
    red:    'bg-red-900/30 text-red-400 border border-red-800/40',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function Button({ children, onClick, variant = 'primary', disabled, loading, className = '', type = 'button' }) {
  const variants = {
    primary: 'bg-gradient-to-r from-cyan-500 to-teal-500 text-gray-900 hover:opacity-90',
    ghost:   'bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
    danger:  'bg-red-900/20 text-red-400 border border-red-900/40 hover:bg-red-900/30',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">{label}</label>}
      <input
        className={`bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2.5 text-sm
          outline-none transition-colors focus:border-[var(--accent)] placeholder:text-[var(--text3)] ${className}`}
        {...props}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">{label}</label>}
      <select
        className={`bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2.5 text-sm
          outline-none transition-colors focus:border-[var(--accent)] ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function ProgressBar({ value, max = 100, color = 'var(--accent)' }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 bg-[var(--bg3)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-[var(--text)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--text3)] hover:text-[var(--text)] text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
