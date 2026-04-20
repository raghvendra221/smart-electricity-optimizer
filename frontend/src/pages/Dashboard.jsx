// pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts';
import { getDashboardData } from '../services/mockApi.js';
import { StatCard, Card, LoadingScreen, ProgressBar } from '../components/ui/index.jsx';
import {
  calcTotalDailyKwh, calcTotalMonthlyBill,
  getTopConsumer, getUsagePercentage, formatCurrency, CHART_COLORS,
} from '../utils/electricity.js';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--card2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs">
      {label && <p className="text-[var(--text3)] mb-1 font-mono">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--accent)' }}>
          {p.name}: <span className="font-mono font-bold">{p.value} {p.unit || ''}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [appliances, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dash, { getAppliances }] = await Promise.all([
          getDashboardData(),
          import('../services/mockApi.js'),
        ]);
        const { appliances: apps } = await getAppliances();
        setData(dash);
        setApps(apps);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingScreen message="Loading dashboard..." />;

  const totalKwh  = calcTotalDailyKwh(appliances);
  const bill      = calcTotalMonthlyBill(appliances);
  const topApp    = getTopConsumer(appliances);
  const totalWh   = appliances.reduce((s, a) => s + a.wattage * a.hours, 0);

  const pieData = appliances.map((a, i) => ({
    name: a.name,
    value: parseFloat(((a.wattage * a.hours) / 1000).toFixed(2)),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const lineData = (data?.months || ['Nov','Dec','Jan','Feb','Mar','Apr']).map((m, i) => ({
    month: m,
    units: data?.monthlyTrend?.[i] ?? 0,
  }));

  const barData = (data?.days || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']).map((d, i) => ({
    day: d,
    kWh: data?.dailyUsage?.[i] ?? 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Overview</h2>
          <p className="text-xs text-[var(--text3)] font-mono mt-0.5">April 2026</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Daily Usage" value={`${totalKwh} kWh`} sub="Today's consumption"
          delta="8.2% vs yesterday" deltaType="up" accentColor="var(--accent)" />
        <StatCard label="Est. Monthly Bill" value={formatCurrency(bill)} sub="At ₹9/kWh"
          delta="3.1% vs last month" deltaType="down" accentColor="var(--accent3)" />
        <StatCard label="Active Devices" value={appliances.length} sub="Tracked appliances"
          delta="All running" deltaType="neutral" accentColor="var(--accent2)" />
        <StatCard label="Top Consumer" value={topApp?.name?.split(' ')[0] || '—'}
          sub={topApp ? `${topApp.wattage}W · ${topApp.hours}h/day` : ''}
          delta="High usage" deltaType="down" accentColor="#fc8181" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Pie */}
        <Card title="Appliance Distribution">
          <div className="flex gap-4 items-center">
            <div style={{ width: 160, height: 160, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                    dataKey="value" paddingAngle={2}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {appliances.map((a, i) => {
                const pct = getUsagePercentage(a, appliances);
                return (
                  <div key={a._id}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs text-[var(--text2)] flex-1 truncate">{a.name.split(' ')[0]}</span>
                      <span className="text-[10px] font-mono text-[var(--text3)]">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} color={CHART_COLORS[i % CHART_COLORS.length]} />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Line */}
        <Card title="Monthly Trend (kWh)">
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,58,92,.5)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="units" stroke="#4fd1c5" strokeWidth={2.5}
                  dot={{ fill: '#4fd1c5', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bar */}
      <Card title="Daily Usage This Week">
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(46,58,92,.5)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="kWh" fill="#7c6aff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
