// pages/Insights.jsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { 
  getInsights, getUsageHistory, applyAutomation, removeAutomation
} from '../services/api.js';
import { StatCard, LoadingScreen, EmptyState, Badge } from '../components/ui/index.jsx';
import { formatCurrency } from '../utils/electricity.js';
import { useToast } from '../context/ToastContext.jsx';

const TYPE_STYLES = {
  warning:  { bg: 'rgba(246,173,85,.08)',  border: 'rgba(246,173,85,.25)',  badge: 'amber',  label: 'Warning', icon: '⚠️'  },
  tip:      { bg: 'rgba(79,209,197,.08)',  border: 'rgba(79,209,197,.25)',  badge: 'cyan',   label: 'Tip', icon: '💡'      },
  schedule: { bg: 'rgba(124,106,255,.08)', border: 'rgba(124,106,255,.25)', badge: 'purple', label: 'Schedule', icon: '📅' },
  alert:    { bg: 'rgba(252,129,129,.08)', border: 'rgba(252,129,129,.25)', badge: 'red',    label: 'Alert', icon: '🔴'    },
  good:     { bg: 'rgba(72,187,120,.08)',  border: 'rgba(72,187,120,.25)',  badge: 'green',  label: 'Good', icon: '✅'     },
};

export default function Insights() {
  const [data, setData] = useState({
    insights: [],
    total_units: 0,
    estimated_bill: 0,
    top_appliance: null,
    appliances: {},
    appliance_costs: {},
    automated_appliances: []
  });
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const { addToast } = useToast();

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [insightsRes, historyRes] = await Promise.all([
        getInsights(),
        getUsageHistory('30d')
      ]);
      
      setData({
        insights: insightsRes.insights || [],
        total_units: insightsRes.total_units || 0,
        estimated_bill: insightsRes.estimated_bill || 0,
        top_appliance: insightsRes.top_appliance || null,
        appliances: insightsRes.appliances || {},
        appliance_costs: insightsRes.appliance_costs || {},
        automated_appliances: insightsRes.automated_appliances || []
      });

      if (historyRes.labels && historyRes.values) {
        const formattedHistory = historyRes.labels.map((label, idx) => ({
          date: label,
          units: historyRes.values[idx]
        }));
        setHistoryData(formattedHistory);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      addToast('Failed to load insights', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingScreen message="Analyzing your usage..." />;

  const { insights, total_units, estimated_bill, top_appliance, appliances, appliance_costs, automated_appliances } = data;
  const totalSavings = insights.reduce((s, i) => s + (i.potentialSaving || 0), 0);
  
  const chartData = Object.keys(appliances).map((name) => ({
    name,
    value: appliances[name],
    cost: appliance_costs[name] || 0
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['var(--accent)', 'var(--accent2)', 'var(--accent3)', 'var(--green)', '#8b5cf6', '#ec4899'];

  const handleApplyAutomation = async (applianceId = null) => {
    setIsApplying(true);
    try {
      await applyAutomation(applianceId);
      addToast('Automation applied successfully!', 'success');
      await loadData(false);
    } catch (error) {
      addToast('Failed to apply automation', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveAutomation = async (applianceId = null) => {
    setIsApplying(true);
    try {
      await removeAutomation(applianceId);
      addToast('Automation deactivated', 'info');
      await loadData(false);
    } catch (error) {
      addToast('Failed to deactivate automation', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const highImpact = insights[0];
  const otherInsights = insights.slice(1);
  const activeRule = top_appliance && automated_appliances?.find(a => 
    a.name.toLowerCase().trim() === top_appliance.toLowerCase().trim()
  );
  const isAutomated = !!activeRule;

  return (
    <div className="pb-10">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)]">AI Insights</h2>
          <p className="text-sm text-[var(--text3)] mt-1">Smart recommendations tailored to your household's energy footprint.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-bold text-[var(--text2)]">Score: {data.efficiency_score || 0}%</span>
        </div>
      </div>

      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Units (Monthly)" value={`${total_units.toFixed(1)} kWh`} sub="Measured this month" accentColor="var(--accent)" />
        <StatCard label="Estimated Bill" value={formatCurrency(estimated_bill)} sub="Based on current usage" accentColor="var(--accent2)" />
        <StatCard label="Top Appliance" value={top_appliance || 'N/A'} sub="Highest consumer" accentColor="var(--accent3)" />
        <StatCard label="Potential Savings" value={formatCurrency(totalSavings)} sub="If optimized" accentColor="var(--green)" />
      </div>

      {/* 2. Usage Graph */}
      <div className="mb-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-semibold text-[var(--text)]">Consumption Trend (30 Days)</h3>
          <div className="text-[10px] font-mono text-[var(--text3)]">Units in kWh</div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: 'var(--text3)', fontSize: 10}} 
                minTickGap={30}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: 'var(--text3)', fontSize: 10}} 
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--card2)', border: '1px solid var(--border)', borderRadius: '12px' }}
                itemStyle={{ color: 'var(--text)', fontSize: '12px' }}
                labelStyle={{ color: 'var(--text2)', marginBottom: '4px', fontSize: '10px' }}
                formatter={(value) => [`${value} kWh`, 'Usage']}
              />
              <Area 
                type="monotone" 
                dataKey="units" 
                stroke="var(--accent)" 
                fillOpacity={1} 
                fill="url(#colorUnits)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Appliance Split */}
      <div className="mb-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Appliance Consumption Split</h3>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-56 h-56 shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none">
                  {chartData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card2)', borderRadius: '12px', border: '1px solid var(--border)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-[var(--text3)] uppercase">Total</span>
              <span className="text-lg font-bold text-[var(--text)]">{total_units.toFixed(1)}</span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {chartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg3)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <div className="text-sm font-medium text-[var(--text)]">{entry.name}</div>
                </div>
                <div className="text-xs font-mono text-[var(--text2)]">{entry.value.toFixed(1)} kWh</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 & 5. Insights Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* High Impact Card */}
        <div className="lg:col-span-2">
          {highImpact ? (
            <div className="w-full bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-8 text-[var(--text)] relative overflow-hidden flex flex-col shadow-xl shadow-[var(--accent)]/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-2xl text-[var(--accent)]">
                  ⚡
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[var(--text)]">High Impact Insight</h4>
                  <p className="text-xs text-[var(--text3)] font-medium">Optimal Saving Potential</p>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold mb-3 leading-tight text-[var(--text)]">{highImpact.title}</h3>
              <p className="text-[var(--text2)] text-sm leading-relaxed mb-8">{highImpact.description}</p>
              
              <div className="mb-6">
                <h5 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-4 opacity-80">Recommended Actions:</h5>
                <ul className="space-y-3">
                  {(highImpact.recommended_actions || [
                    `Optimize ${top_appliance || 'appliance'} usage during peak hours`,
                    "Enable power-saving or eco mode",
                    "Avoid continuous operation"
                  ]).map((action, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-[var(--text2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mt-1.5"></span>
                      <span className="leading-relaxed">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <div className="inline-flex items-center gap-4">
                  <div className="px-5 py-3 bg-[var(--bg3)] rounded-xl border border-[var(--border)]">
                    <div className="text-[10px] text-[var(--text3)] font-mono uppercase mb-0.5">Estimated Savings</div>
                    <div className="text-[var(--accent)] font-bold text-lg">₹{highImpact.potentialSaving}/mo</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-8 right-8 text-[var(--text3)]">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--border)]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--border)]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--border)]"></div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon="⚡" title="No critical actions" subtitle="Everything is running efficiently." />
          )}
        </div>

        {/* Remaining Insights */}
        <div className="space-y-4">
          {otherInsights.map((insight) => {
            const style = TYPE_STYLES[insight.type] || TYPE_STYLES.tip;
            return (
              <div key={insight.id} className="bg-[var(--card)] border border-[var(--border)] rounded-[2rem] p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 text-xl">
                    {insight.icon}
                  </div>
                  <Badge variant={style.badge}>{style.label}</Badge>
                </div>
                <h5 className="font-bold text-[var(--text)] mb-2">{insight.title}</h5>
                <p className="text-xs text-[var(--text3)] leading-relaxed mb-4">{insight.description}</p>
                <div className="text-[11px] font-bold text-[var(--accent2)]">
                  Save {formatCurrency(insight.potentialSaving)}/mo
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
