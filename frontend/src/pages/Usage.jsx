// pages/Usage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { MdSave, MdAccessTime, MdElectricBolt, MdFilterList } from 'react-icons/md';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  getAppliances, logUsage, getUsageSummary, getUsageHistory, getUsageLogs,
} from '../services/api.js';
import {
  Card, LoadingScreen, EmptyState, Button, Badge,
} from '../components/ui/index.jsx';
import { formatCurrency } from '../utils/electricity.js';
import { useToast } from '../context/ToastContext.jsx';

/* ── Chart Tooltip ──────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--card2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      {label && <p className="text-[var(--text3)] mb-1 font-mono">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || (p.dataKey === 'kWh' ? 'var(--accent)' : 'var(--text3)') }}>
          {p.name}: <span className="font-mono font-bold">{p.value} kWh</span>
        </p>
      ))}
    </div>
  );
};

/* ── Range Tabs ─────────────────────────────────────────────────── */
const RANGES = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'ytd', label: 'YTD' },
];

/* ── Main Component ─────────────────────────────────────────────── */
export default function Usage() {
  const [summary, setSummary] = useState({ total_units: 0, estimated_bill: 0 });
  const [history, setHistory] = useState({ labels: [], values: [] });
  const [logs, setLogs] = useState([]);
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');

  // Log form state
  const [selectedAppliance, setSelectedAppliance] = useState('');
  const [duration, setDuration] = useState('');
  const [durationUnit, setDurationUnit] = useState('mins');
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();

  /* ── Initial Load ─────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, historyRes, logsRes, appliancesRes] = await Promise.all([
          getUsageSummary().catch(() => ({ total_units: 0, estimated_bill: 0 })),
          getUsageHistory('7d').catch(() => ({ labels: [], values: [] })),
          getUsageLogs().catch(() => ({ logs: [] })),
          getAppliances().catch(() => ({ appliances: [] })),
        ]);
        setSummary(summaryRes);
        setHistory(historyRes);
        setLogs(logsRes.logs || []);
        setAppliances(appliancesRes.appliances || []);
      } catch {
        addToast('Failed to load usage data', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Range Toggle ─────────────────────────────────────────────── */
  const handleRangeChange = useCallback(async (newRange) => {
    setRange(newRange);
    try {
      const res = await getUsageHistory(newRange);
      setHistory(res);
    } catch {
      addToast('Failed to load history', 'error');
    }
  }, []);

  /* ── Log Usage Submit ─────────────────────────────────────────── */
  async function handleLogUsage() {
    if (!selectedAppliance) { addToast('Select an appliance', 'error'); return; }
    const rawDuration = parseFloat(duration);
    if (!rawDuration || rawDuration <= 0) { addToast('Enter valid duration', 'error'); return; }
    const mins = durationUnit === 'hrs' ? rawDuration * 60 : rawDuration;

    setSaving(true);
    try {
      const hours = mins / 60;
      await logUsage({ applianceId: selectedAppliance, hours });
      addToast('Usage logged!', 'success');

      // Refresh all data
      const [summaryRes, historyRes, logsRes] = await Promise.all([
        getUsageSummary().catch(() => summary),
        getUsageHistory(range).catch(() => history),
        getUsageLogs().catch(() => ({ logs })),
      ]);
      setSummary(summaryRes);
      setHistory(historyRes);
      setLogs(logsRes.logs || logs);
      setDuration('');
    } catch {
      addToast('Failed to log usage', 'error');
    } finally {
      setSaving(false);
    }
  }

  /* ── Chart Data ───────────────────────────────────────────────── */
  const chartData = (history.labels || []).map((label, i) => ({
    label,
    kWh: (history.values || [])[i] ?? 0,
    original_kWh: (history.original_values || [])[i] ?? 0,
  }));

  const maxVal = Math.max(...chartData.map(d => d.kWh), 1);

  if (loading) return <LoadingScreen message="Loading usage data..." />;

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Usage Tracking</h1>
          <p className="text-xs text-[var(--text3)] mt-0.5">Monitor your historical consumption and log manual activities.</p>
        </div>
        {(summary.total_units ?? 0) > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-900/25 border border-green-800/40 text-green-400 text-xs font-medium shrink-0">
            <MdElectricBolt size={14} />
            {(summary.total_units ?? 0).toFixed(1)} kWh today
          </div>
        )}
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center text-sm">⚡</span>
            <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">Units Today</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[var(--text3)] mb-1 uppercase">Optimized</p>
              <p className="text-2xl font-bold font-mono text-[var(--accent)] leading-none">
                {(summary.total_units ?? 0).toFixed(2)} <span className="text-xs font-normal">kWh</span>
              </p>
            </div>
            <div className="border-l border-[var(--border)] pl-4 opacity-60">
              <p className="text-[10px] text-[var(--text3)] mb-1 uppercase">Original</p>
              <p className="text-2xl font-bold font-mono text-[var(--text3)] leading-none">
                {(summary.original_total_units ?? summary.total_units ?? 0).toFixed(2)} <span className="text-xs font-normal">kWh</span>
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-[var(--accent3)]/15 flex items-center justify-center text-sm">💰</span>
            <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">Estimated Bill</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[var(--text3)] mb-1 uppercase">With Opt</p>
              <p className="text-2xl font-bold font-mono text-[var(--accent3)] leading-none">
                {formatCurrency(summary.estimated_bill ?? 0)}
              </p>
            </div>
            <div className="border-l border-[var(--border)] pl-4 opacity-60">
              <p className="text-[10px] text-[var(--text3)] mb-1 uppercase">Without Opt</p>
              <p className="text-2xl font-bold font-mono text-[var(--text3)] leading-none">
                {formatCurrency(summary.original_estimated_bill ?? summary.estimated_bill ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + Log Activity ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Consumption History Chart */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Consumption History</h3>
            <div className="flex bg-[var(--bg3)] rounded-lg p-0.5 border border-[var(--border)]">
              {RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => handleRangeChange(r.key)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold font-mono transition-all duration-200 ${
                    range === r.key
                      ? 'bg-[var(--accent)] text-gray-900 shadow-sm'
                      : 'text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,58,92,.4)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Space Mono, monospace' }}
                    axisLine={false} tickLine={false}
                    interval={chartData.length > 14 ? Math.floor(chartData.length / 7) : 0}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Space Mono, monospace' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${v} kWh`}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(79,209,197,0.06)' }} />
                  <Bar dataKey="kWh" name="Optimized" radius={[4, 4, 0, 0]} fill="var(--accent)" fillOpacity={0.85} />
                  <Bar dataKey="original_kWh" name="Original" radius={[4, 4, 0, 0]} fill="var(--text3)" fillOpacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-xs text-[var(--text3)] italic">
              No consumption data for this period
            </div>
          )}
        </Card>

        {/* Log Activity Panel */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">➕</span>
            <h3 className="text-sm font-semibold text-[var(--text)]">Log Activity</h3>
          </div>
          <p className="text-[10px] text-[var(--text3)] mb-4">Manually record offline appliance usage.</p>

          <div className="space-y-4">
            {/* Appliance Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">Appliance Type</label>
              <select
                value={selectedAppliance}
                onChange={e => setSelectedAppliance(e.target.value)}
                className="w-full bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2.5 text-sm
                  outline-none transition-colors focus:border-[var(--accent)] appearance-none"
              >
                <option value="">Select appliance...</option>
                {appliances.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.wattage}W)</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">Duration</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 60"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="flex-1 bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2.5 text-sm
                    outline-none transition-colors focus:border-[var(--accent)] placeholder:text-[var(--text3)]
                    font-mono"
                />
                <select
                  value={durationUnit}
                  onChange={e => setDurationUnit(e.target.value)}
                  className="w-24 bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2.5 text-sm
                    outline-none transition-colors focus:border-[var(--accent)] appearance-none"
                >
                  <option value="mins">Mins</option>
                  <option value="hrs">Hrs</option>
                </select>
              </div>
            </div>

            {/* Quick duration buttons */}
            <div className="flex gap-2">
              {[15, 30, 60, 120].map(m => {
                const isMatch = durationUnit === 'mins' ? duration === String(m) : duration === String(m / 60);
                return (
                  <button
                    key={m}
                    onClick={() => {
                      if (m >= 60) {
                        setDurationUnit('hrs');
                        setDuration(String(m / 60));
                      } else {
                        setDurationUnit('mins');
                        setDuration(String(m));
                      }
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all duration-200 ${
                      isMatch
                        ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]'
                        : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text3)] hover:border-[var(--accent)]/30'
                    }`}
                  >
                    {m >= 60 ? `${m / 60}h` : `${m}m`}
                  </button>
                );
              })}
            </div>

            {/* Submit */}
            <Button onClick={handleLogUsage} loading={saving} className="w-full justify-center">
              <MdSave size={16} /> Save Entry
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Recent Activity Log ─────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">Recent Activity Log</h3>
          <span className="text-[10px] font-mono text-[var(--text3)]">{logs.length} entries</span>
        </div>

        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Appliance', 'Timestamp', 'Duration', 'Energy', 'Source'].map(h => (
                    <th key={h} className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest pb-3 pr-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border)]/40 hover:bg-[var(--bg3)]/50 transition-colors duration-150"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-xs">
                          🔌
                        </div>
                        <span className="text-sm text-[var(--text)] font-medium">{log.appliance ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs font-mono text-[var(--text2)]">{log.timestamp ?? '—'}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs font-mono text-[var(--text2)]">{log.duration ?? '—'}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-[var(--accent)]">{log.energy ?? 0} kWh</span>
                        {log.is_automated && (
                          <span className="text-[9px] font-mono text-[var(--text3)] line-through">
                            {log.original_energy} kWh
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.source?.startsWith('Auto') ? 'cyan' : 'purple'}>
                          {log.source ?? 'Manual'}
                        </Badge>
                        {log.is_automated && (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5">
                              🛡️ Optimized
                            </span>
                            <span className="text-[8px] text-green-500/80 font-mono">
                              -{log.saved_energy} kWh
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="📊"
            title="No activity yet"
            subtitle="Log your first usage entry to see it here"
          />
        )}
      </Card>
    </div>
  );
}
