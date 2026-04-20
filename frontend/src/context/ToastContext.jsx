// context/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const borders = {
    success: 'border-l-[3px] border-l-green-400',
    error:   'border-l-[3px] border-l-red-400',
    info:    'border-l-[3px] border-l-cyan-400',
    warning: 'border-l-[3px] border-l-amber-400',
  };
  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-sm
        bg-[var(--card2)] border border-[var(--border)] shadow-lg cursor-pointer animate-slide-in ${borders[toast.type]}`}
      style={{ color: 'var(--text)' }}
      onClick={() => onRemove(toast.id)}
    >
      <span className="font-mono text-xs">{icons[toast.type]}</span>
      <span>{toast.message}</span>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
