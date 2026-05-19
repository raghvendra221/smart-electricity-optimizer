// pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { getDashboard, getAIInsights, getPrediction } from '../services/api.js';
import { Card, LoadingScreen, Badge } from '../components/ui/index.jsx';
import { formatCurrency, CHART_COLORS } from '../utils/electricity.js';

/* ── Custom Tooltip ────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--card2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      {label && <p className="text-[var(--text3)] mb-1 font-mono">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--accent)' }}>
          {p.name}: <span className="font-mono font-bold">{p.value} kWh</span>
        </p>
      ))}
    </div>
  );
};

/* ── Pie Center Label ──────────────────────────────────────────────── */
const PieCenterLabel = ({ viewBox, totalUsage }) => {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text3)" fontSize={10} fontFamily="Space Mono, monospace">
        Total
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text)" fontSize={14} fontWeight="bold" fontFamily="Space Mono, monospace">
        {totalUsage.toFixed(1)}
      </text>
    </g>
  );
};

/* ── Main Dashboard ────────────────────────────────────────────────── */
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [insights, setInsights] = useState([]);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch fast dashboard data first
        const dash = await getDashboard();
        setData(dash);
      } catch (error) {
        console.error("Dashboard load error", error);
      } finally {
        // Turn off main loading screen instantly once dashboard is ready
        setLoading(false);
      }

      // Fetch slow AI insights in the background without blocking the UI
      try {
        setLoadingInsights(true);
        const ai = await getAIInsights();
        setInsights(Array.isArray(ai.insights) ? ai.insights : []);
      } catch (error) {
        setInsights([]);
      } finally {
        setLoadingInsights(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingScreen message="Loading dashboard..." />;

  /* ── Data transforms ─────────────────────────────────────────────── */
  const dailyUnits = data?.daily_units ?? 0;
  const originalDailyUnits = data?.original_daily_units ?? dailyUnits;
  const estimatedBill = data?.estimated_bill ?? 0;
  const originalEstimatedBill = data?.original_estimated_bill ?? estimatedBill;
  const predictedBill = data?.predicted_bill ?? 0;
  const originalPredictedBill = data?.original_predicted_bill ?? predictedBill;
  const savingsToday = data?.savings_today ?? 0;
  const monthlyChange = data?.monthly_change ?? 0;
  const topConsumer = data?.top_consumer || null;

  // weekly_trend {Mon:10, ...} → chart array
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = DAYS.map(day => ({
    day,
    kWh: data?.weekly_trend?.[day] ?? 0,
  }));

  // appliance_usage → pie data
  const pieData = Object.entries(data?.appliance_usage || {}).map(([name, units], i) => ({
    name,
    value: parseFloat((units ?? 0).toFixed(2)),
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter(d => d.value > 0);

  const totalUsage = pieData.reduce((s, d) => s + d.value, 0);

  const changeIsPositive = monthlyChange >= 0;

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Dashboard Overview</h1>
        <p className="text-xs text-[var(--text3)] mt-0.5">Real-time electricity optimization for your smart hub.</p>
      </div>

      {/* ── Top Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center text-sm">⚡</span>
              <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">Daily Units</span>
            </div>
            {savingsToday > 0 && <Badge variant="green">-{(originalDailyUnits - dailyUnits).toFixed(2)} kWh Saved</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[var(--text3)] mb-1 uppercase">Optimized</p>
              <p className="text-2xl font-bold font-mono text-[var(--accent)] leading-none">
                {dailyUnits.toFixed(1)} <span className="text-xs font-normal">kWh</span>
              </p>
            </div>
            <div className="border-l border-[var(--border)] pl-4 opacity-60">
              <p className="text-[10px] text-[var(--text3)] mb-1 uppercase">Original</p>
              <p className="text-2xl font-bold font-mono text-[var(--text3)] leading-none">
                {originalDailyUnits.toFixed(1)} <span className="text-xs font-normal">kWh</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[var(--accent3)]/15 flex items-center justify-center text-sm">💰</span>
              <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">Predicted Bill</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[var(--text3)] mb-1 uppercase">With Opt</p>
              <p className="text-2xl font-bold font-mono text-[var(--accent3)] leading-none">
                {formatCurrency(predictedBill)}
              </p>
            </div>
            <div className="border-l border-[var(--border)] pl-4 opacity-60">
              <p className="text-[10px] text-[var(--text3)] mb-1 uppercase">Without Opt</p>
              <p className="text-2xl font-bold font-mono text-[var(--text3)] leading-none">
                {formatCurrency(originalPredictedBill)}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text3)] mt-3 font-mono">Today's Est: {formatCurrency(estimatedBill)} (Saved {formatCurrency(savingsToday)})</p>
        </div>

        {/* Monthly Change */}
        <div className={`rounded-2xl p-5 flex flex-col justify-between border ${
          changeIsPositive
            ? 'bg-red-950/40 border-red-900/40'
            : 'bg-green-950/40 border-green-900/40'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm">📊</span>
            <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">Monthly Change</span>
          </div>
          <p className={`text-3xl font-bold font-mono leading-none ${
            monthlyChange === null ? 'text-[var(--text3)]' :
            changeIsPositive ? 'text-red-400' : 'text-green-400'
          }`}>
            {monthlyChange === null ? 'No Data' : `${changeIsPositive ? '+' : ''}${monthlyChange.toFixed(1)}%`}
          </p>
          <p className="text-[10px] text-[var(--text3)] mt-1.5 font-mono">
            {monthlyChange === null ? 'Insufficient historical data' : 'Compared to last month'}
          </p>
        </div>
      </div>

      {/* ── Main Content: Chart + Right Sidebar ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Weekly Consumption — spans 3 cols */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Weekly Consumption</h3>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientKwh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,58,92,.4)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Space Mono, monospace' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Space Mono, monospace' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${v} kWh`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="kWh" name="Usage"
                  stroke="var(--accent)" strokeWidth={2.5}
                  fill="url(#gradientKwh)"
                  dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--card)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right column — spans 2 cols */}
        <div className="lg:col-span-2 space-y-4">

          {/* Smart Insights */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">✨</span>
              <h3 className="text-sm font-semibold text-[var(--text)]">Smart Insights</h3>
            </div>

            {loadingInsights ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-mono text-[var(--text3)] animate-pulse">Generating AI Insights...</p>
              </div>
            ) : insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div key={insight.id} className="flex items-start gap-2.5">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      insight.type === 'warning' ? 'bg-amber-400' :
                      insight.type === 'alert' ? 'bg-red-400' : 'bg-[var(--accent)]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text2)] leading-relaxed">
                        <span className="font-semibold text-[var(--text)]">{insight.title}</span>
                        {' — '}{insight.description}
                      </p>
                      {(insight.potentialSaving ?? 0) > 0 && (
                        <p className="text-[10px] font-mono text-[var(--accent3)] mt-0.5">
                          Save up to ₹{insight.potentialSaving}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text3)] italic">No insights available yet. Log more usage to get AI recommendations.</p>
            )}
          </Card>

          {/* Appliance Split */}
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Appliance Split</h3>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData} cx="50%" cy="50%"
                        innerRadius={38} outerRadius={60}
                        dataKey="value" paddingAngle={3}
                        strokeWidth={0}
                      >
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {pieData.map((a) => {
                    const pct = totalUsage ? Math.round((a.value / totalUsage) * 100) : 0;
                    return (
                      <div key={a.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: a.color }} />
                        <span className="text-xs text-[var(--text2)] flex-1 truncate">{a.name}</span>
                        <span className="text-[10px] font-mono text-[var(--text3)]">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--text3)] italic text-center py-6">No usage tracked today</p>
            )}

            {/* Top Consumer Callout */}
            {topConsumer && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2">
                <Badge variant="red">Top Consumer</Badge>
                <span className="text-xs font-semibold text-[var(--text)]">{topConsumer}</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
