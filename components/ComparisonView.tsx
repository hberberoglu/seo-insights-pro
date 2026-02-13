
import React, { useMemo, useState } from 'react';
import { ComparisonItem } from '../types';
import { DataTable } from './DataTable';

interface ComparisonViewProps {
  data: ComparisonItem[];
  type: 'url' | 'query';
  onTypeChange: (type: 'url' | 'query') => void;
  activeRange: { start: string; end: string };
  prevRange: { start: string; end: string };
  onViewDetail: (type: 'url' | 'query', metric: 'clicks' | 'position', trend: 'rising' | 'falling') => void;
  onItemClick: (key: string) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ 
  data, 
  type, 
  onTypeChange, 
  activeRange, 
  prevRange, 
  onViewDetail,
  onItemClick 
}) => {
  const [sortMode, setSortMode] = useState<'percentage' | 'absolute'>('percentage');
  
  // Detect common domain prefix to strip it
  const domainPrefix = useMemo(() => {
    if (type !== 'url' || data.length === 0) return '';
    const urls = data.map(d => d.key);
    if (urls.length < 2) return '';
    const first = urls[0];
    let common = '';
    for (let i = 0; i < first.length; i++) {
      const char = first[i];
      if (urls.every(u => u[i] === char)) {
        common += char;
      } else {
        break;
      }
    }
    // Only return if it looks like a protocol/domain
    return common.includes('://') ? common : '';
  }, [data, type]);

  const stripPrefix = (text: string) => {
    if (domainPrefix && text.startsWith(domainPrefix)) {
      return text.slice(domainPrefix.length) || '/';
    }
    return text;
  };

  const getPercentage = (item: ComparisonItem, metric: 'clicks' | 'position') => {
    if (metric === 'clicks') {
      const prev = Math.max(item.prevClicks, 1);
      return (item.clickDelta / prev) * 100;
    } else {
      const prev = Math.max(item.prevAvgPosition, 0.1);
      // Improvement: (Prev - Current) / Prev * 100
      // If position goes 10 -> 5, it's a 50% improvement
      return ((item.prevAvgPosition - item.avgPosition) / prev) * 100;
    }
  };

  const deltaPill = (item: ComparisonItem, metric: 'clicks' | 'position') => {
    const val = metric === 'clicks' ? item.clickDelta : item.positionDelta;
    const pct = getPercentage(item, metric);
    
    // Position: Negative delta is good (e.g. 10th to 5th = -5)
    // Clicks: Positive delta is good
    const isGood = metric === 'clicks' ? val > 0 : val < 0;
    const colorClass = isGood ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100';
    
    let displayVal = '';
    if (sortMode === 'absolute') {
      const arrow = val > 0 ? '↑' : '↓';
      displayVal = `${arrow} ${Math.abs(val).toFixed(metric === 'position' ? 1 : 0)}`;
    } else {
      const arrow = pct > 0 ? '↑' : '↓';
      displayVal = `${arrow} %${Math.abs(pct).toFixed(1)}`;
    }

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${colorClass}`}>
        {displayVal}
      </span>
    );
  };

  const getSorted = (metric: 'clicks' | 'position', trend: 'rising' | 'falling') => {
    let sorted = [...data];
    
    if (metric === 'clicks') {
      if (sortMode === 'percentage') {
        sorted.sort((a, b) => {
          const pctA = getPercentage(a, 'clicks');
          const pctB = getPercentage(b, 'clicks');
          return trend === 'rising' ? pctB - pctA : pctA - pctB;
        });
      } else {
        sorted.sort((a, b) => trend === 'rising' ? b.clickDelta - a.clickDelta : a.clickDelta - b.clickDelta);
      }
    } else {
      // Filter out items that didn't exist in both periods for position calculation
      sorted = sorted.filter(item => item.prevAvgPosition > 0 && item.avgPosition > 0);
      
      if (sortMode === 'percentage') {
        sorted.sort((a, b) => {
          const pctA = getPercentage(a, 'position');
          const pctB = getPercentage(b, 'position');
          // For position rising (improvement), pct is positive.
          return trend === 'rising' ? pctB - pctA : pctA - pctB;
        });
      } else {
        // Absolute: Rising means positionDelta is negative (e.g. -5 is better than -2)
        sorted.sort((a, b) => trend === 'rising' ? a.positionDelta - b.positionDelta : b.positionDelta - a.positionDelta);
      }
    }
    return sorted.slice(0, 7);
  };

  const card = (title: string, metric: 'clicks' | 'position', trend: 'rising' | 'falling', color: string, icon: string) => {
    const items = getSorted(metric, trend);
    const label = type === 'url' ? 'SAYFA' : 'SORGU';

    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <h3 className={`text-lg font-black text-${color}-700 flex items-center gap-3`}>
            <div className={`bg-${color}-100 p-2 rounded-xl`}>{icon}</div>
            {title}
          </h3>
          <button 
            onClick={() => onViewDetail(type, metric, trend)}
            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
          >
            Hepsini Gör
          </button>
        </div>
        
        <div className="flex-grow">
          <DataTable<ComparisonItem>
            data={items}
            columns={[
              { 
                header: label, 
                accessor: (item) => (
                  <span className={`block font-bold text-xs ${type === 'url' ? 'font-mono text-indigo-600' : 'text-slate-700'} truncate max-w-[400px]`}>
                    {stripPrefix(item.key)}
                  </span>
                )
              },
              { header: 'ÖNC.', accessor: (item) => metric === 'clicks' ? item.prevClicks.toLocaleString() : item.prevAvgPosition.toFixed(1) },
              { header: 'AKTİF', accessor: (item) => <span className="font-black">{metric === 'clicks' ? item.clicks.toLocaleString() : item.avgPosition.toFixed(1)}</span> },
              { header: 'FARK', accessor: (item) => deltaPill(item, metric) }
            ]}
            onRowClick={(item) => onItemClick(item.key)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Yükselenler & Düşenler</h2>
          <p className="text-slate-500 font-medium">Performans değişimi analizi.</p>
          {domainPrefix && (
            <p className="text-[10px] font-black text-indigo-400 uppercase mt-2">Kök Dizin: <span className="font-mono bg-indigo-50 px-1">{domainPrefix}</span></p>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Analysis Type Toggle */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Analiz Kapsamı</span>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button 
                onClick={() => onTypeChange('query')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'query' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Sorgu
              </button>
              <button 
                onClick={() => onTypeChange('url')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                URL
              </button>
            </div>
          </div>

          {/* Sorting Mode Toggle */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sıralama Modu</span>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button 
                onClick={() => setSortMode('percentage')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${sortMode === 'percentage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                % Oran
              </button>
              <button 
                onClick={() => setSortMode('absolute')}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${sortMode === 'absolute' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                ± Fark
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 h-fit self-end">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase">Önceki</p>
              <p className="text-[10px] font-bold text-slate-600">{prevRange.start}</p>
            </div>
            <div className="text-slate-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </div>
            <div>
              <p className="text-[9px] font-black text-indigo-400 uppercase">Aktif</p>
              <p className="text-[10px] font-black text-indigo-600">{activeRange.start}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="grid grid-cols-1 gap-10">
          {card('Tıklama Artanlar', 'clicks', 'rising', 'emerald', '↑')}
          {card('Tıklama Azalanlar', 'clicks', 'falling', 'rose', '↓')}
          {card('Pozisyonu Yükselenler', 'position', 'rising', 'blue', '★')}
          {card('Pozisyonu Düşenler', 'position', 'falling', 'amber', '⚠')}
        </div>
      </div>
    </div>
  );
};
