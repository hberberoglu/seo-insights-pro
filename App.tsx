
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ViewType, AppState, SummaryStats, PageStats, QueryStats, BQConfig, ComparisonItem } from './types';
import { DataService } from './services/dataService';
import { StatsGrid } from './components/StatsGrid';
import { DataTable } from './components/DataTable';
import { InsightBox } from './components/InsightBox';
import { SettingsView } from './components/SettingsView';
import { ComparisonView } from './components/ComparisonView';
import { ComparisonDetailView } from './components/ComparisonDetailView';

const DEFAULT_CONFIG: BQConfig = {
  projectId: '',
  datasetId: 'searchconsole',
  tableId: 'searchdata_url_impression',
  location: 'US',
  clientId: '',
  aiLanguage: 'tr'
};

const App: React.FC = () => {
  const savedConfig = localStorage.getItem('seo_insight_bq_config');
  const initialConfig = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;
  if (initialConfig && !initialConfig.aiLanguage) initialConfig.aiLanguage = 'tr';

  const [state, setState] = useState<AppState>({
    view: initialConfig.projectId ? 'overview' : 'settings',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    config: initialConfig,
    token: undefined
  });

  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDates, setTempDates] = useState({ start: state.startDate, end: state.endDate });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [summaryData, setSummaryData] = useState<SummaryStats | null>(null);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonItem[]>([]);
  const [comparisonType, setComparisonType] = useState<'url' | 'query'>('query');
  
  const [editableUrl, setEditableUrl] = useState('');
  const [editableQuery, setEditableQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: 'ASC' | 'DESC' }>({ col: 'clicks', dir: 'DESC' });

  useEffect(() => {
    if (state.selectedUrl) setEditableUrl(state.selectedUrl);
    if (state.selectedQuery) setEditableQuery(state.selectedQuery);
  }, [state.selectedUrl, state.selectedQuery]);

  useEffect(() => {
    setSortConfig({ col: 'clicks', dir: 'DESC' });
  }, [state.view]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setTempDates({ start: state.startDate, end: state.endDate });
  }, [state.startDate, state.endDate]);

  const comparisonPeriod = useMemo(() => {
    const s = new Date(state.startDate);
    const e = new Date(state.endDate);
    const diff = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const pEnd = new Date(s); pEnd.setDate(pEnd.getDate() - 1);
    const pStart = new Date(pEnd); pStart.setDate(pStart.getDate() - (diff - 1));
    return {
      active: { start: state.startDate, end: state.endDate },
      prev: { start: pStart.toISOString().split('T')[0], end: pEnd.toISOString().split('T')[0] }
    };
  }, [state.startDate, state.endDate]);

  const loadData = useCallback(async () => {
    if (state.view === 'settings' || !state.token || !state.config.projectId) return;

    setLoading(true);
    setError(null);
    try {
      if (state.view === 'overview') {
        const result = await DataService.getOverview(state.config, state.token, state.startDate, state.endDate);
        setSummaryData(result);
      } else if (state.view === 'comparison' || state.view === 'comparisonDetail') {
        const result = await DataService.getComparisonData(
          state.config, state.token, comparisonType,
          comparisonPeriod.active.start, comparisonPeriod.active.end, 
          comparisonPeriod.prev.start, comparisonPeriod.prev.end
        );
        setComparisonData(result);
      } else if (state.view === 'pageDetail') {
        if (state.selectedUrl) {
          const result = await DataService.getUrlDetails(state.config, state.token, state.selectedUrl, state.startDate, state.endDate, sortConfig.col, sortConfig.dir);
          setDetailData(result);
        } else {
          const result = await DataService.getTopEntities(state.config, state.token, 'url', state.startDate, state.endDate, sortConfig.col, sortConfig.dir);
          setDetailData(result);
        }
      } else if (state.view === 'queryDetail') {
        if (state.selectedQuery) {
          const result = await DataService.getQueryDetails(state.config, state.token, state.selectedQuery, state.startDate, state.endDate, sortConfig.col, sortConfig.dir);
          setDetailData(result);
        } else {
          const result = await DataService.getTopEntities(state.config, state.token, 'query', state.startDate, state.endDate, sortConfig.col, sortConfig.dir);
          setDetailData(result);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu.');
      if (err.message?.includes('auth')) setState(prev => ({ ...prev, token: undefined, view: 'overview' }));
    } finally {
      setLoading(false);
    }
  }, [state.view, state.startDate, state.endDate, state.selectedUrl, state.selectedQuery, state.token, state.config, comparisonPeriod, sortConfig, comparisonType]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGoogleLogin = () => {
    if (!state.config.clientId) {
      alert("Lütfen önce Google Cloud Console'dan aldığınız Client ID'yi girin.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: state.config.clientId,
        scope: 'https://www.googleapis.com/auth/bigquery.readonly',
        callback: (response: any) => {
          setIsLoggingIn(false);
          if (response.access_token) {
            setState(prev => ({ ...prev, token: response.access_token, view: 'overview' }));
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      console.error(e);
      setIsLoggingIn(false);
      alert("Google login başlatılamadı. Client ID'nin doğruluğundan emin olun.");
    }
  };

  const setDatePreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    switch (preset) {
      case 'last7': start.setDate(today.getDate() - 7); break;
      case 'last28': start.setDate(today.getDate() - 28); break;
      case 'last90': start.setDate(today.getDate() - 90); break;
      case 'last180': start.setDate(today.getDate() - 180); break;
    }
    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];
    setState(prev => ({ ...prev, startDate: sStr, endDate: eStr }));
    setTempDates({ start: sStr, end: eStr });
    setIsDatePickerOpen(false);
  };

  const handleApplyCustomDates = () => {
    setState(prev => ({ ...prev, startDate: tempDates.start, endDate: tempDates.end }));
    setIsDatePickerOpen(false);
  };

  const handleFetchUrl = () => { if (editableUrl) setState(prev => ({ ...prev, selectedUrl: editableUrl, view: 'pageDetail' })); };
  const handleFetchQuery = () => { if (editableQuery) setState(prev => ({ ...prev, selectedQuery: editableQuery, view: 'queryDetail' })); };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      col: key,
      dir: prev.col === key && prev.dir === 'DESC' ? 'ASC' : 'DESC'
    }));
  };

  return (
    <div className="min-h-screen pb-12 bg-slate-50/50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => state.token && setState(prev => ({ ...prev, view: 'overview', selectedUrl: undefined, selectedQuery: undefined }))}>
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">SEO Insight Pro</h1>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.2em]">BigQuery Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {state.view !== 'settings' && state.token && (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-400 transition-all">
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Aralık</p>
                    <p className="text-sm font-bold text-slate-700">{state.startDate} — {state.endDate}</p>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isDatePickerOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 z-50">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Hızlı Seçim</h4>
                        <div className="grid grid-cols-1 gap-1">
                          {[{ label: 'Son 7 Gün', val: 'last7' }, { label: 'Son 28 Gün', val: 'last28' }, { label: 'Son 90 Gün', val: 'last90' }, { label: 'Son 180 Gün', val: 'last180' }].map(p => (
                            <button key={p.val} onClick={() => setDatePreset(p.val)} className="text-left px-3 py-2 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors">{p.label}</button>
                          ))}
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Özel Aralık</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Başlangıç</label>
                            <input type="date" value={tempDates.start} onChange={e => setTempDates(p => ({ ...p, start: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-400" />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Bitiş</label>
                            <input type="date" value={tempDates.end} onChange={e => setTempDates(p => ({ ...p, end: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-400" />
                          </div>
                          <button onClick={handleApplyCustomDates} className="w-full py-2.5 bg-indigo-600 text-white font-black text-xs uppercase rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Uygula</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {state.token && (
              <button onClick={() => setState(prev => ({ ...prev, view: 'settings' }))} className={`p-2.5 rounded-xl border ${state.view === 'settings' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!state.token ? (
          <div className="max-w-xl mx-auto mt-20 bg-white border border-slate-200 rounded-[3rem] p-12 shadow-2xl text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-indigo-600 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-100">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Verilere Erişmek İçin Bağlanın</h2>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed">Analizlere başlamak için önce Google Cloud Console'dan aldığınız <b>Client ID</b> bilgisini girin ve hesabınızla bağlanın.</p>
            
            <div className="space-y-6 text-left mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">OAuth Client ID</label>
                <input 
                  type="text" 
                  value={state.config.clientId} 
                  onChange={e => setState(p => ({ ...p, config: { ...p.config, clientId: e.target.value } }))}
                  placeholder="örn: 12345678-abcd.apps.googleusercontent.com"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-mono text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>
              <button 
                onClick={handleGoogleLogin} 
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-4 py-5 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoggingIn ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {isLoggingIn ? 'Bağlantı Kuruluyor...' : 'Google ile Bağlan'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">BigQuery Read-Only yetkisi gerektirir</p>
          </div>
        ) : (
          <>
            <nav className="flex items-center gap-8 mb-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <button onClick={() => setState(prev => ({ ...prev, view: 'overview', selectedUrl: undefined, selectedQuery: undefined }))} className={`hover:text-indigo-600 transition-all ${state.view === 'overview' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : ''}`}>Genel Bakış</button>
              <button onClick={() => setState(prev => ({ ...prev, view: 'comparison' }))} className={`hover:text-indigo-600 transition-all ${state.view === 'comparison' || state.view === 'comparisonDetail' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : ''}`}>Yükselenler/Düşenler</button>
              <button onClick={() => setState(prev => ({ ...prev, view: 'pageDetail', selectedUrl: undefined }))} className={`hover:text-indigo-600 transition-all ${state.view === 'pageDetail' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : ''}`}>Sayfa Analizi</button>
              <button onClick={() => setState(prev => ({ ...prev, view: 'queryDetail', selectedQuery: undefined }))} className={`hover:text-indigo-600 transition-all ${state.view === 'queryDetail' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : ''}`}>Sorgu Analizi</button>
            </nav>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-40">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                <p className="text-slate-800 font-black tracking-tight">Veriler İşleniyor...</p>
              </div>
            ) : (
              <>
                {state.view === 'overview' && summaryData && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="mb-10">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Kritik Performans Metrikleri</h2>
                      <p className="text-slate-500 font-medium">Seçili dönemin önceki dönem ve geçen yıl ile karşılaştırmalı analizi.</p>
                    </div>
                    <StatsGrid stats={summaryData} />
                  </div>
                )}

                {state.view === 'pageDetail' && (
                  <section className="animate-in fade-in duration-500">
                    {state.selectedUrl && <InsightBox context={`URL: ${state.selectedUrl}`} data={detailData} language={state.config.aiLanguage} />}
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                      <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sayfa Performans Analizi</h2>
                          <p className="text-slate-400 text-sm font-medium mt-1">{state.selectedUrl ? 'Seçili URL performansı' : 'En çok tıklama alan sayfalar'}</p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                          <input type="text" placeholder="URL ile ara..." value={editableUrl} onChange={e => setEditableUrl(e.target.value)} className="flex-grow md:w-80 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ring-indigo-100 outline-none" />
                          <button onClick={handleFetchUrl} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl">Getir</button>
                        </div>
                      </div>
                      <DataTable 
                        data={detailData} 
                        currentSort={sortConfig}
                        onSort={handleSort}
                        columns={[
                          { header: state.selectedUrl ? 'SORGU' : 'SAYFA URL', sortKey: state.selectedUrl ? 'query' : 'url', accessor: (item) => <span className="text-indigo-600 font-bold truncate block max-w-sm">{item.query || item.url}</span> },
                          { header: 'TIKLAMA', sortKey: 'clicks', accessor: (item) => item.clicks.toLocaleString() },
                          { header: 'GÖSTERİM', sortKey: 'impressions', accessor: (item) => item.impressions.toLocaleString() },
                          { header: 'CTR', sortKey: 'ctr', accessor: (item) => `%${item.ctr.toFixed(2)}` },
                          { header: 'POS.', sortKey: 'avgPosition', accessor: (item) => <span className="bg-slate-100 px-3 py-1 rounded-lg font-black">{item.avgPosition.toFixed(1)}</span> },
                        ]} 
                        onRowClick={item => item.url ? setState(prev => ({ ...prev, selectedUrl: item.url })) : setState(prev => ({ ...prev, view: 'queryDetail', selectedQuery: item.query }))} 
                      />
                    </div>
                  </section>
                )}

                {state.view === 'queryDetail' && (
                  <section className="animate-in fade-in duration-500">
                    {state.selectedQuery && <InsightBox context={`Sorgu: ${state.selectedQuery}`} data={detailData} language={state.config.aiLanguage} />}
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                      <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sorgu Analiz Ekranı</h2>
                          <p className="text-slate-400 text-sm font-medium mt-1">{state.selectedQuery ? `"${state.selectedQuery}" sorgusu detayları` : 'En popüler arama sorguları'}</p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                          <input type="text" placeholder="Sorgu ile ara..." value={editableQuery} onChange={e => setEditableQuery(e.target.value)} className="flex-grow md:w-80 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ring-indigo-100 outline-none" />
                          <button onClick={handleFetchQuery} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl">Getir</button>
                        </div>
                      </div>
                      <DataTable 
                        data={detailData} 
                        currentSort={sortConfig}
                        onSort={handleSort}
                        columns={[
                          { header: state.selectedQuery ? 'HEDEF URL' : 'ARAMA SORGU', sortKey: state.selectedQuery ? 'url' : 'query', accessor: (item) => <span className="text-indigo-600 font-bold truncate block max-w-sm">{item.url || item.query}</span> },
                          { header: 'TIKLAMA', sortKey: 'clicks', accessor: (item) => item.clicks.toLocaleString() },
                          { header: 'GÖSTERİM', sortKey: 'impressions', accessor: (item) => item.impressions.toLocaleString() },
                          { header: 'CTR', sortKey: 'ctr', accessor: (item) => `%${item.ctr.toFixed(2)}` },
                          { header: 'POS.', sortKey: 'avgPosition', accessor: (item) => <span className="bg-slate-100 px-3 py-1 rounded-lg font-black">{item.avgPosition.toFixed(1)}</span> },
                        ]} 
                        onRowClick={item => item.query ? setState(prev => ({ ...prev, selectedQuery: item.query })) : setState(prev => ({ ...prev, view: 'pageDetail', selectedUrl: item.url }))} 
                      />
                    </div>
                  </section>
                )}

                {state.view === 'comparison' && (
                  <ComparisonView data={comparisonData} type={comparisonType} onTypeChange={setComparisonType} activeRange={comparisonPeriod.active} prevRange={comparisonPeriod.prev} 
                    onItemClick={k => comparisonType === 'url' ? setState(prev => ({ ...prev, view: 'pageDetail', selectedUrl: k })) : setState(prev => ({ ...prev, view: 'queryDetail', selectedQuery: k }))}
                    onViewDetail={(type, metric, trend) => setState(prev => ({ ...prev, view: 'comparisonDetail', comparisonDetail: { type, metric, trend } }))} 
                  />
                )}

                {state.view === 'comparisonDetail' && state.comparisonDetail && (
                  <ComparisonDetailView data={comparisonData} {...state.comparisonDetail} onBack={() => setState(prev => ({ ...prev, view: 'comparison' }))} onItemClick={k => state.comparisonDetail?.type === 'url' ? setState(prev => ({ ...prev, view: 'pageDetail', selectedUrl: k })) : setState(prev => ({ ...prev, view: 'queryDetail', selectedQuery: k }))} />
                )}

                {state.view === 'settings' && <SettingsView config={state.config} token={state.token} onSave={c => setState(prev => ({ ...prev, config: c }))} onConnect={t => setState(prev => ({ ...prev, token: t, view: 'overview' }))} />}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
