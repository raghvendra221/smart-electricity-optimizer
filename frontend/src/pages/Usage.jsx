// pages/Usage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { MdSave } from 'react-icons/md';
import { getAppliances, logUsage, getUsageSummary, getApplianceUsage } from '../services/api.js';
import { Card, StatCard, LoadingScreen, EmptyState, Button, ProgressBar } from '../components/ui/index.jsx';
import { calcDailyKwh, calculateBill, formatCurrency, CHART_COLORS } from '../utils/electricity.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Usage() {
  const [appliances, setAppliances] = useState([]);
  const [hoursMap, setHoursMap]     = useState({});
  const [summary, setSummary]       = useState({ total_units: 0, estimated_bill: 0 });
  const [applianceUsage, setApplianceUsage] = useState({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const { addToast } = useToast();

  const loadSummary = async (updateHours = false) => {
    try {
      const [summaryData, usageData] = await Promise.all([
        getUsageSummary(),
        getApplianceUsage()
      ]);
      
      setSummary(summaryData);
      setApplianceUsage(usageData);

      if (updateHours && summaryData.hours_map) {
        setHoursMap((prev) => {
          const next = { ...prev };
          Object.keys(summaryData.hours_map).forEach((id) => {
            next[id] = summaryData.hours_map[id];
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to load usage summary', err);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const [{ appliances: data }] = await Promise.all([
          getAppliances(),
          loadSummary()
        ]);
        setAppliances(data);
      } catch {
        addToast('Failed to load usage data', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Correcting useEffect to use the fetched data for hoursMap
  useEffect(() => {
    if (appliances.length > 0 && summary.hours_map) {
      const map = {};
      appliances.forEach((a) => { 
        map[a.id] = summary.hours_map?.[a.id] ?? 0; 
      });
      setHoursMap(map);
    }
  }, [appliances, summary.hours_map]);

  const setHours = useCallback((id, val) => {
    setHoursMap((prev) => ({ ...prev, [id]: parseFloat(val) }));
  }, []);

  const withHours = appliances.map((a) => ({
    ...a,
    hours: hoursMap[a.id] ?? 0,
  }));

  // LIVE CALCULATIONS
  const liveTotalUnits = withHours.reduce((sum, a) => sum + calcDailyKwh(a.wattage, a.hours), 0);
  const liveTotalBill  = calculateBill(liveTotalUnits);

  async function handleSaveAll() {
    setSaving(true);
    try {
      await Promise.all(
        appliances.map((a) => logUsage({ applianceId: a.id, hours: hoursMap[a.id] ?? 0 }))
      );
      addToast('Usage saved successfully!', 'success');
      await loadSummary(true); // Refresh totals and hours from backend
    } catch {
      addToast('Failed to save usage', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen message="Loading usage data..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Usage Tracking</h2>
          <p className="text-xs text-[var(--text3)] font-mono mt-0.5">Adjust hours per appliance — today</p>
        </div>
        <Button onClick={handleSaveAll} loading={saving}>
          <MdSave size={15} /> Save All
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Total Today" value={`${liveTotalUnits.toFixed(2)} kWh`}
          sub="Live projection" accentColor="var(--accent)" />
        <StatCard label="Today's Cost" value={formatCurrency(Math.round(liveTotalBill))}
          sub="Estimated total" accentColor="var(--accent3)" />
      </div>

      {appliances.length === 0 ? (
        <EmptyState icon="📈" title="No appliances to track"
          subtitle="Add appliances first to start tracking usage." />
      ) : (
        <div className="space-y-3">
          {withHours.map((a, i) => {
            const color  = CHART_COLORS[i % CHART_COLORS.length];
            const liveKwh = calcDailyKwh(a.wattage, a.hours);
            const liveCost = Math.round(liveKwh * 9);
            const pct    = Math.round((a.hours / 24) * 100);

            return (
              <div key={a.id} className="bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-[var(--text)] text-sm">{a.name}</div>
                    <div className="text-[11px] font-mono text-[var(--text3)] mt-0.5">{a.wattage}W rated</div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="text-right">
                      <div className="text-xs font-mono text-[var(--accent)]">{liveKwh} kWh</div>
                      <div className="text-[10px] font-mono text-[var(--accent3)]">{formatCurrency(liveCost)}/day</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[var(--text3)] w-5">0</span>
                  <input
                    type="range" min="0" max="24" step="0.5"
                    value={a.hours}
                    onChange={(e) => setHours(a.id, e.target.value)}
                    className="flex-1 accent-cyan-400"
                    style={{ accentColor: color }}
                  />
                  <span className="text-[10px] font-mono text-[var(--text3)] w-5 text-right">24</span>
                  <div className="font-mono text-sm font-bold w-10 text-right" style={{ color }}>
                    {a.hours}h
                  </div>
                </div>

                <div className="mt-2">
                  <ProgressBar value={pct} color={color} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
