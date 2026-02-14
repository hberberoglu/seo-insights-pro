
import React from 'react';
import { SummaryStats, MetricSet } from '../types';

interface MetricCardProps {
  label: string;
  current: number;
  previous: number;
  prevYear: number;
  format: (val: number) => string;
  isInverse?: boolean;
}

const ComparisonRow = ({ label, current, compare, format, isInverse }: { label: string, current: number, compare: number, format: (val: number) => string, isInverse?: boolean }) => {
  const delta = current - compare;
  const pct = compare !== 0 ? (delta / Math.abs(compare)) * 100 : 0;
  const isGood = isInverse ? delta < 0 : delta > 0;
  const colorClass = delta === 0 ? 'text-slate-400' : isGood ? 'text-emerald-500' : 'text-rose-500';
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '•';

  return (
    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-600">{format(compare)}</span>
        <div className={`flex items-center gap-1 text-[11px] font-black ${colorClass}`}>
          <span>{arrow} {Math.abs(pct).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<MetricCardProps> = ({ label, current, previous, prevYear, format, isInverse }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</p>
    <p className="text-3xl font-black text-slate-900 mb-4">{format(current)}</p>
    
    <div className="space-y-1">
      <ComparisonRow label="Önceki Dönem" current={current} compare={previous} format={format} isInverse={isInverse} />
      <ComparisonRow label="Geçen Yıl" current={current} compare={prevYear} format={format} isInverse={isInverse} />
    </div>
  </div>
);

export const StatsGrid: React.FC<{ stats: SummaryStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <MetricCard 
        label="Toplam Tıklama" 
        current={stats.current.clicks} 
        previous={stats.previous.clicks} 
        prevYear={stats.prevYear.clicks} 
        format={v => v.toLocaleString()} 
      />
      <MetricCard 
        label="Toplam Gösterim" 
        current={stats.current.impressions} 
        previous={stats.previous.impressions} 
        prevYear={stats.prevYear.impressions} 
        format={v => v.toLocaleString()} 
      />
      <MetricCard 
        label="Ortalama CTR" 
        current={stats.current.ctr} 
        previous={stats.previous.ctr} 
        prevYear={stats.prevYear.ctr} 
        format={v => `%${v.toFixed(2)}`} 
      />
      <MetricCard 
        label="Ortalama Pozisyon" 
        current={stats.current.avgPosition} 
        previous={stats.previous.avgPosition} 
        prevYear={stats.prevYear.avgPosition} 
        format={v => v.toFixed(1)} 
        isInverse={true}
      />
    </div>
  );
};
