// pages/Appliances.jsx
import React, { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdOpenInNew } from 'react-icons/md';
import {
  getAppliances, addAppliance, updateAppliance, deleteAppliance, getApplianceStats,
} from '../services/api.js';
import {
  Card, Button, Input, Modal, Badge, LoadingScreen, EmptyState,
} from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';

/* ── Appliance icons by keyword ─────────────────────────────────── */
const APPLIANCE_ICONS = {
  ac: '❄️', air: '❄️', fan: '🌀', light: '💡', lamp: '💡', led: '💡',
  fridge: '🧊', refrigerator: '🧊', tv: '📺', television: '📺',
  washer: '🫧', washing: '🫧', dryer: '👕', heater: '🔥', geyser: '🔥',
  oven: '🍳', microwave: '🍳', kitchen: '🍳', iron: '👔',
  computer: '💻', pc: '💻', laptop: '💻', router: '📡', wifi: '📡',
  charger: '🔋', pump: '💧', motor: '⚙️',
};

function getApplianceIcon(name) {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(APPLIANCE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '🔌';
}

/* ── Filter tabs ────────────────────────────────────────────────── */
const FILTERS = ['All', 'Active', 'Standby'];

const BLANK = { name: '', wattage: '' };

/* ── Main Component ─────────────────────────────────────────────── */
export default function Appliances() {
  const [appliances, setAppliances] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK);
  const [formErrors, setFormErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(BLANK);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        getAppliances(),
        getApplianceStats().catch(() => ({ appliances: [] })),
      ]);
      setAppliances(listRes.appliances || []);
      setStats(statsRes.appliances || []);
    } catch {
      addToast('Failed to load appliances', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Merge list data with stats data by id
  const mergedAppliances = appliances.map(a => {
    const s = stats.find(s => s.id === a.id) || {};
    return { ...a, ...s };
  });

  // Apply filter & search
  const filtered = mergedAppliances.filter(a => {
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Active' && a.status === 'active') ||
      (filter === 'Standby' && a.status !== 'active');
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Summary stats
  const activeCount = mergedAppliances.filter(a => a.status === 'active').length;
  const standbyCount = mergedAppliances.length - activeCount;
  const totalCost = mergedAppliances.reduce((s, a) => s + (a.cost ?? 0), 0);

  function validateForm(f) {
    const e = {};
    if (!f.name.trim()) e.name = 'Name required';
    if (!f.wattage || +f.wattage <= 0) e.wattage = 'Invalid wattage';
    return e;
  }

  async function handleAdd() {
    const e = validateForm(form);
    if (Object.keys(e).length) { setFormErrors(e); return; }

    setAdding(true);
    try {
      await addAppliance({ name: form.name, wattage: +form.wattage });
      load();
      setForm(BLANK);
      setFormErrors({});
      setShowAddModal(false);
      addToast('Appliance added!', 'success');
    } catch {
      addToast('Failed to add', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteAppliance(id);
      setAppliances(prev => prev.filter(a => a.id !== id));
      setStats(prev => prev.filter(a => a.id !== id));
      addToast('Deleted!', 'success');
    } catch {
      addToast('Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  function openEditModal(appliance) {
    setEditItem(appliance);
    setEditForm({ name: appliance.name, wattage: appliance.wattage });
    setFormErrors({});
  }

  async function handleUpdate() {
    const e = validateForm(editForm);
    if (Object.keys(e).length) { setFormErrors(e); return; }

    try {
      await updateAppliance(editItem.id, {
        name: editForm.name,
        wattage: +editForm.wattage,
      });
      load();
      setEditItem(null);
      addToast('Updated!', 'success');
    } catch {
      addToast('Failed to update', 'error');
    }
  }

  if (loading) return <LoadingScreen message="Loading appliances..." />;

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Appliances</h1>
          <p className="text-xs text-[var(--text3)] mt-0.5">Manage and optimize your connected energy endpoints.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="shrink-0">
          <MdAdd size={18} /> Add Appliance
        </Button>
      </div>

      {/* ── Summary Strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-mono text-[var(--text)]">{mergedAppliances.length}</p>
          <p className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest mt-1">Total</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-mono text-green-400">{activeCount}</p>
          <p className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest mt-1">Active</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-mono text-[var(--accent3)]">₹{totalCost.toFixed(2)}</p>
          <p className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest mt-1">Today's Cost</p>
        </div>
      </div>

      {/* ── Filters + Search ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex bg-[var(--bg3)] rounded-lg p-0.5 border border-[var(--border)]">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                filter === f
                  ? 'bg-[var(--accent)] text-gray-900 shadow-sm'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 w-full sm:max-w-xs">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" size={16} />
          <input
            type="text"
            placeholder="Search appliances..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] rounded-lg pl-9 pr-3 py-2 text-xs
              outline-none transition-colors focus:border-[var(--accent)] placeholder:text-[var(--text3)]"
          />
        </div>
      </div>

      {/* ── Appliance Grid ──────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🔌"
          title={search || filter !== 'All' ? 'No matching appliances' : 'No appliances yet'}
          subtitle={search || filter !== 'All' ? 'Try adjusting your filters' : 'Add your first appliance to start tracking'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => {
            const icon = getApplianceIcon(a.name);
            const isActive = a.status === 'active';
            const currentDraw = a.current_draw_kw ?? 0;
            const hours = a.hours_used ?? 0;
            const cost = a.cost ?? 0;

            return (
              <div
                key={a.id}
                className="group bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5
                  hover:border-[var(--accent)]/50 hover:shadow-lg hover:shadow-cyan-900/10
                  transition-all duration-300 relative overflow-hidden"
              >
                {/* Glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Top row: icon + name + status */}
                <div className="flex items-start justify-between mb-4 relative">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-xl">
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text)] leading-tight">{a.name}</h3>
                      <p className="text-[10px] font-mono text-[var(--text3)] mt-0.5">{a.wattage ?? 0}W rated</p>
                    </div>
                  </div>
                  <Badge variant={isActive ? 'green' : 'amber'}>
                    {isActive ? '● Active' : 'Standby'}
                  </Badge>
                </div>

                {/* Current Draw — hero number */}
                <div className="bg-[var(--bg3)] rounded-xl p-3 mb-4 text-center border border-[var(--border)]/50 relative">
                  <p className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest mb-1">Current Draw</p>
                  <p className="text-2xl font-bold font-mono text-[var(--text)]">
                    {currentDraw} <span className="text-sm font-normal text-[var(--text3)]">kW</span>
                  </p>
                  {/* Mini usage bar */}
                  <div className="mt-2 h-1 bg-[var(--bg2)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min((currentDraw / (a.wattage ? a.wattage / 1000 : 1)) * 100, 100)}%`,
                        background: isActive ? 'var(--accent)' : 'var(--text3)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-mono text-[var(--text3)]">Low</span>
                    <span className="text-[9px] font-mono text-[var(--text3)]">Peak</span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[var(--bg3)] rounded-lg p-2.5 text-center border border-[var(--border)]/30">
                    <p className="text-[10px] text-[var(--text3)] mb-0.5">🕐 Runtime</p>
                    <p className="text-sm font-bold font-mono text-[var(--text)]">
                      {hours >= 1
                        ? `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`
                        : `${Math.round(hours * 60)}m`
                      }
                    </p>
                  </div>
                  <div className="bg-[var(--bg3)] rounded-lg p-2.5 text-center border border-[var(--border)]/30">
                    <p className="text-[10px] text-[var(--text3)] mb-0.5">💰 Est. Cost</p>
                    <p className="text-sm font-bold font-mono text-[var(--accent3)]">₹{cost.toFixed(2)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 relative">
                  <button
                    onClick={() => openEditModal(a)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                      bg-[var(--bg3)] border border-[var(--border)] text-[var(--text2)]
                      hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-200"
                  >
                    <MdEdit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                      bg-red-900/15 border border-red-900/30 text-red-400
                      hover:bg-red-900/30 transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MdDelete size={14} />
                  </button>
                  <button
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                      bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)]
                      hover:bg-[var(--accent)]/20 transition-all duration-200"
                  >
                    <MdOpenInNew size={14} /> Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Appliance Modal ─────────────────────────────────── */}
      <Modal title="Add Appliance" isOpen={showAddModal} onClose={() => { setShowAddModal(false); setFormErrors({}); }}>
        <div className="space-y-4">
          <Input
            label="Name" placeholder="e.g. Central AC"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            error={formErrors.name}
          />
          <Input
            label="Wattage (W)" type="number" placeholder="e.g. 1500"
            value={form.wattage}
            onChange={e => setForm({ ...form, wattage: e.target.value })}
            error={formErrors.wattage}
          />
          <Button onClick={handleAdd} loading={adding} className="w-full justify-center">
            <MdAdd size={18} /> Add Appliance
          </Button>
        </div>
      </Modal>

      {/* ── Edit Appliance Modal ────────────────────────────────── */}
      {editItem && (
        <Modal title="Edit Appliance" isOpen={true} onClose={() => { setEditItem(null); setFormErrors({}); }}>
          <div className="space-y-4">
            <Input
              label="Name"
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              error={formErrors.name}
            />
            <Input
              label="Wattage (W)" type="number"
              value={editForm.wattage}
              onChange={e => setEditForm({ ...editForm, wattage: e.target.value })}
              error={formErrors.wattage}
            />
            <Button onClick={handleUpdate} className="w-full justify-center">Update</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}