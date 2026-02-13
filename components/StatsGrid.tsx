
import React from 'react';
import { SummaryStats } from '../types';

export const StatsGrid: React.FC<{ stats: SummaryStats }> = ({ stats }) => {
  const items = [
    { label: 'Total Clicks', value: stats.totalClicks.toLocaleString(), color: 'text-indigo-600' },
    { label: 'Total Impressions', value: stats.totalImpressions.toLocaleString(), color: 'text-emerald-600' },
    { label: 'Avg. CTR', value: `${stats.avgCtr.toFixed(2)}%`, color: 'text-orange-600' },
    { label: 'Avg. Position', value: stats.avgPosition.toFixed(1), color: 'text-blue-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {items.map((item, idx) => (
        <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
};
