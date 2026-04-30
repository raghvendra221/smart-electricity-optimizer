// pages/Insights.jsx
import React, { useEffect, useState } from 'react';
import { getInsights } from '../services/api.js';
import { StatCard, LoadingScreen, EmptyState, Badge } from '../components/ui/index.jsx';
import { formatCurrency } from '../utils/electricity.js';
import { useToast } from '../context/ToastContext.jsx';

const TYPE_STYLES = {
  warning:  { bg: 'rgba(246,173,85,.08)',  border: 'rgba(246,173,85,.25)',  badge: 'amber',  label: 'Warning'  },
  tip:      { bg: 'rgba(79,209,197,.08)',  border: 'rgba(79,209,197,.25)',  badge: 'cyan',   label: 'Tip'      },
  schedule: { bg: 'rgba(124,106,255,.08)', border: 'rgba(124,106,255,.25)', badge: 'purple', label: 'Schedule' },
  alert:    { bg: 'rgba(252,129,129,.08)', border: 'rgba(252,129,129,.25)', badge: 'red',    label: 'Alert'    },
  good:     { bg: 'rgba(72,187,120,.08)',  border: 'rgba(72,187,120,.25)',  badge: 'green',  label: 'Good'     },
};

export default function Insights() {
  const [data, setData] = useState({
    insights: [],
    total_units: 0,
    total_cost: 0,
    top_appliance: null,
    appliances: {}
  });
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const response = await getInsights();
        setData({
          insights: response.insights || [],
          total_units: response.total_units || 0,
          total_cost: response.total_cost || 0,
          top_appliance: response.top_appliance || null,
          appliances: response.appliances || {}
        });
      } catch (error) {
        console.error('Error loading insights:', error);
        addToast('Failed to load insights', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [addToast]);

  if (loading) return <LoadingScreen message="Analyzing your usage..." />;

  const { insights, total_units, total_cost, top_appliance } = data;
  const totalSavings = insights.reduce((s, i) => s + (i.potentialSaving || 0), 0);
  const actionCount = insights.filter((i) => i.type !== 'good').length;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[var(--text)]">Smart Insights</h2>
        <p className="text-xs text-[var(--text3)] font-mono mt-0.5">AI-powered recommendations for your usage</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          label="Potential Monthly Savings"
          value={formatCurrency(totalSavings)}
          sub="If all tips are followed"
          accentColor="var(--green)"
        />
        <StatCard
          label="Action Items"
          value={actionCount}
          sub="Recommendations pending"
          accentColor="var(--accent2)"
        />
      </div>

      {/* Usage Summary - All calculations from backend */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Total Units Consumed"
          value={total_units.toFixed(2)}
          sub="kWh this month"
          accentColor="var(--accent)"
        />
        <StatCard
          label="Total Cost"
          value={formatCurrency(total_cost)}
          sub="Estimated billing"
          accentColor="var(--accent2)"
        />
        <StatCard
          label="Top Appliance"
          value={top_appliance || 'N/A'}
          sub="Highest consumption"
          accentColor="var(--warning)"
        />
      </div>

      {/* Insight Cards */}
      {insights.length === 0 ? (
        <EmptyState icon="💡" title="No insights yet" subtitle="Add appliances and log usage to get personalized recommendations." />
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const style = TYPE_STYLES[insight.type] || TYPE_STYLES.tip;
            return (
              <div
                key={insight.id}
                className="flex gap-4 items-start rounded-xl p-4 border transition-all duration-200 hover:scale-[1.005]"
                style={{ background: style.bg, borderColor: style.border }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                  {insight.icon}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-[var(--text)] leading-snug">{insight.title}</h4>
                    <Badge variant={style.badge}>{style.label}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text2)] mt-1.5 leading-relaxed">{insight.description}</p>
                  {insight.potentialSaving > 0 ? (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-mono text-green-400">💰</span>
                      <span className="text-[11px] font-mono text-green-400">
                        Save up to {formatCurrency(insight.potentialSaving)}/month
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-[var(--accent)] mt-2">✓ No action needed</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
