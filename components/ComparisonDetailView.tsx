
import React, { useState, useMemo } from 'react';
import { ComparisonItem } from '../types';
import { DataTable } from './DataTable';

interface ComparisonDetailViewProps {
  data: ComparisonItem[];
  type: 'url' | 'query';
  metric: 'clicks' | 'position';
  trend: 'rising' | 'falling';
  onBack: () => void;
  onItemClick: (key: string) => void;
}

export const ComparisonDetailView: React.FC<ComparisonDetailViewProps> = ({ 
  data, type, metric, trend, onBack, onItemClick 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<'percentage' | 'absolute'>('percentage');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const getPercentage = (item: ComparisonItem, m: 'clicks' | 'position') => {
    if (m === 'clicks') {
      const prev = Math.max(item.prevClicks, 1);
      return (item.clickDelta / prev) * 100;
    } else {
      const prev = Math.max(item.prevAvgPosition, 0.1);
      return ((item.prevAvgPosition - item.avgPosition) / prev) * 100;
    }
  };

  const sortedData = useMemo(() => {
    let base = [...data];
    
    if (metric === 'clicks') {
      if (sortMode === 'percentage') {
        base.sort((a, b) => {
          const pctA = getPercentage(a, 'clicks');
          const pctB = getPercentage(b, 'clicks');
          return trend === 'rising' ? pctB - pctA : pctA - pctB;
        });
      } else {
        base.sort((a, b) => trend === 'rising' ? b.clickDelta - a.clickDelta : a.clickDelta - b.clickDelta);
      }
    } else {
      base = base.filter(item => item.prevAvgPosition > 0 && item.avgPosition > 0);
      if (sortMode === 'percentage') {
        base.sort((a, b) => {
          const pctA = getPercentage(a, 'position');
          const pctB = getPercentage(b, 'position');
          return trend === 'rising' ? pctB - pctA : pctA - pctB;
        });
      } else {
        base.sort((a, b) => trend === 'rising' ? a.positionDelta - b.positionDelta : b.positionDelta - a.positionDelta);
      }
    }

    if (searchTerm) {
      base = base.filter(item => item.key.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return base;
  }, [data, metric, trend, searchTerm, sortMode]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const title = `${metric === 'clicks' ? 'Tıklama' : 'Pozisyon'} ${trend === 'rising' ? 'Yükselen' : 'Düşen'} ${type === 'url' ? 'Sayfalar' : 'Sorgular'}`;
  const color = trend === 'rising' ? 'emerald' : 'rose';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Geri Dön
        </button>
        <div className="text-right">
          <h2 className={`text-2xl font-black text-${color}-600 tracking-tight`}>{title}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Tam Liste Analizi ({sortedData.length} sonuç)</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="mb-8 flex flex-col md:flex-row gap-6 justify-between items-end">
          <div className="relative flex-grow w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button 
              onClick={() => { setSortMode('percentage'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortMode === 'percentage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              % Oran
            </button>
            <button 
              onClick={() => { setSortMode('absolute'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortMode === 'absolute' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              ± Fark
            </button>
          </div>
        </div>

        <DataTable<ComparisonItem>
          data={paginatedData}
          columns={[
            { header: type === 'url' ? 'URL' : 'SORGU', accessor: (item) => <span className={`font-bold ${type === 'url' ? 'font-mono text-[11px] text-indigo-600' : 'text-slate-800'}`}>{item.key}</span> },
            { header: 'ÖNC. CLICKS', accessor: (item) => item.prevClicks.toLocaleString() },
            { header: 'AKTİF CLICKS', accessor: (item) => item.clicks.toLocaleString() },
            { header: 'CL. FARK', accessor: (item) => <span className={item.clickDelta > 0 ? 'text-emerald-600 font-bold' : item.clickDelta < 0 ? 'text-rose-600 font-bold' : ''}>{item.clickDelta > 0 ? '+' : ''}{item.clickDelta}</span> },
            { header: 'ÖNC. POS.', accessor: (item) => item.prevAvgPosition.toFixed(1) },
            { header: 'AKTİF POS.', accessor: (item) => item.avgPosition.toFixed(1) },
            { header: 'POS. FARK', accessor: (item) => <span className={item.positionDelta < 0 ? 'text-emerald-600 font-bold' : item.positionDelta > 0 ? 'text-rose-600 font-bold' : ''}>{item.positionDelta > 0 ? '+' : ''}{item.positionDelta.toFixed(1)}</span> },
            { 
              header: 'ORAN %', 
              accessor: (item) => {
                const pct = getPercentage(item, metric);
                const isGood = metric === 'clicks' ? pct > 0 : pct > 0; // ImprovementPct is positive
                return <span className={`font-black ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>%{pct.toFixed(1)}</span>;
              }
            }
          ]}
          onRowClick={(item) => onItemClick(item.key)}
        />

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">SAYFA {currentPage} / {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
