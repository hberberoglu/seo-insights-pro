
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
  const [error, setError] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<{
    pages: PageStats[],
    queries: QueryStats[],
    summary: SummaryStats
  } | null>(null);

  const [detailData, setDetailData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonItem[]>([]);
  const [comparisonType, setComparisonType] = useState<'url' | 'query'>('query');
  
  // URL details local state
  const [editableUrl, setEditableUrl] = useState('');
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: 'ASC' | 'DESC' }>({ col: 'clicks', dir: 'DESC' });

  // Sync editableUrl when selectedUrl changes from navigation
  useEffect(() => {
    if (state.selectedUrl) {
      setEditableUrl(state.selectedUrl);
    } else if (state.view === 'pageDetail') {
      setEditableUrl('');
      setDetailData([]);
    }
  }, [state.selectedUrl, state.view]);

  // Reset sorting when switching views
  useEffect(() => {
    setSortConfig({ col: 'clicks', dir: 'DESC' });
  }, [state.view]);

  // Calculate Comparison Period
  const comparisonPeriod = useMemo(() => {
    const s = new Date(state.startDate);
    const e = new Date(state.endDate);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const prevEnd = new Date(s);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (diffDays - 1));

    return {
      active: { start: state.startDate, end: state.endDate },
      prev: { 
        start: prevStart.toISOString().split('T')[0], 
        end: prevEnd.toISOString().split('T')[0] 
      }
    };
  }, [state.startDate, state.endDate]);

  const loadData = useCallback(async () => {
    if (state.view === 'settings' || !state.token || !state.config.projectId) return;

    // Don't trigger loading if we're in pageDetail but no URL is selected yet
    if (state.view === 'pageDetail' && !state.selectedUrl) {
      setDetailData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (state.view === 'overview') {
        const result = await DataService.getOverview(state.config, state.token, state.startDate, state.endDate);
        setData(result);
      } else if (state.view === 'comparison' || state.view === 'comparisonDetail') {
        const result = await DataService.getComparisonData(
          state.config, 
          state.token, 
          comparisonType,
          comparisonPeriod.active.start, 
          comparisonPeriod.active.end, 
          comparisonPeriod.prev.start, 
          comparisonPeriod.prev.end
        );
        setComparisonData(result);
      } else if (state.view === 'pageDetail' && state.selectedUrl) {
        const result = await DataService.getUrlDetails(
          state.config, 
          state.token, 
          state.selectedUrl, 
          state.startDate, 
          state.endDate,
          sortConfig.col,
          sortConfig.dir
        );
        setDetailData(result);
      } else if (state.view === 'queryDetail' && state.selectedQuery) {
        const result = await DataService.getQueryDetails(state.config, state.token, state.selectedQuery, state.startDate, state.endDate);
        setDetailData(result);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Veri yüklenirken bir hata oluştu.');
      if (err.message?.includes('auth') || err.message?.includes('token')) {
        setState(prev => ({ ...prev, token: undefined, view: 'settings' }));
      }
    } finally {
      setLoading(false);
    }
  }, [state.view, state.startDate, state.endDate, state.selectedUrl, state.selectedQuery, state.token, state.config, comparisonPeriod, sortConfig, comparisonType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageClick = (url: string) => {
    setState(prev => ({ ...prev, view: 'pageDetail', selectedUrl: url }));
  };

  const handleQueryClick = (query: string) => {
    setState(prev => ({ ...prev, view: 'queryDetail', selectedQuery: query }));
  };

  const handleFetchUrl = () => {
    if (!editableUrl) return;
    setState(prev => ({ ...prev, selectedUrl: editableUrl, view: 'pageDetail' }));
  };

  const toggleSort = (column: string) => {
    setSortConfig(prev => ({
      col: column,
      dir: prev.col === column && prev.dir === 'DESC' ? 'ASC' : 'DESC'
    }));
  };

  const handleConfigUpdate = (newConfig: BQConfig) => {
    localStorage.setItem('seo_insight_bq_config', JSON.stringify(newConfig));
    setState(prev => ({ ...prev, config: newConfig }));
  };

  const handleConnect = (token: string) => {
    setState(prev => ({ ...prev, token, view: 'overview' }));
  };

  const setDatePreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'last7':
        start.setDate(today.getDate() - 7);
        break;
      case 'last28':
        start.setDate(today.getDate() - 28);
        break;
      case 'last30':
        start.setDate(today.getDate() - 30);
        break;
      case 'last60':
        start.setDate(today.getDate() - 60);
        break;
      case 'last90':
        start.setDate(today.getDate() - 90);
        break;
      case 'last1year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'prevYear':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        break;
    }

    setState(prev => ({
      ...prev,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }));
    setIsDatePickerOpen(false);
  };

  const presets = [
    { label: 'Dün', value: 'yesterday' },
    { label: 'Son 7 Gün', value: 'last7' },
    { label: 'Son 28 Gün', value: 'last28' },
    { label: 'Son 30 Gün', value: 'last30' },
    { label: 'Son 60 Gün', value: 'last60' },
    { label: 'Son 90 Gün', value: 'last90' },
    { label: 'Son 1 Yıl', value: 'last1year' },
    { label: 'Geçen Yıl', value: 'prevYear' },
  ];

  return (
    <div className="min-h-screen pb-12 bg-slate-50/50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setState(prev => ({ ...prev, view: 'overview', selectedUrl: undefined, selectedQuery: undefined }))}
          >
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">SEO Insight Pro</h1>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.2em]">BigQuery Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {state.view !== 'settings' && state.token && (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  className={`flex items-center gap-3 px-4 py-2.5 bg-white border rounded-xl shadow-sm transition-all duration-200 ${isDatePickerOpen ? 'ring-2 ring-indigo-100 border-indigo-400' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
                >
                  <div className="bg-slate-50 p-1.5 rounded-lg text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Analiz Aralığı</p>
                    <p className="text-sm font-bold text-slate-700">{state.startDate} — {state.endDate}</p>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isDatePickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDatePickerOpen && (
                  <div className="absolute right-0 mt-3 w-[440px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Hızlı Seçim</h3>
                        <div className="space-y-1">
                          {presets.map((p) => (
                            <button
                              key={p.value}
                              onClick={() => setDatePreset(p.value)}
                              className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-l border-slate-100 pl-8">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Özel Aralık</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Başlangıç</label>
                            <input 
                              type="date" 
                              value={state.startDate}
                              onChange={(e) => setState(prev => ({ ...prev, startDate: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bitiş</label>
                            <input 
                              type="date" 
                              value={state.endDate}
                              onChange={(e) => setState(prev => ({ ...prev, endDate: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                            />
                          </div>
                          <button 
                            onClick={() => setIsDatePickerOpen(false)}
                            className="w-full bg-indigo-600 text-white text-xs font-black uppercase py-2.5 rounded-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all mt-2"
                          >
                            Uygula
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setState(prev => ({ ...prev, view: 'settings' }))}
              className={`p-2.5 rounded-xl border transition-all duration-200 ${state.view === 'settings' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-inner' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:shadow-md'}`}
              title="Ayarlar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!state.token && state.view !== 'settings' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center animate-in fade-in duration-500">
            <h2 className="text-xl font-black text-amber-900 mb-4">Verilere Erişmek İçin Bağlanın</h2>
            <p className="text-amber-700 mb-6">BigQuery verilerinizi görüntülemek için Ayarlar sayfasından Google hesabınızla giriş yapmanız gerekmektedir.</p>
            <button 
              onClick={() => setState(prev => ({ ...prev, view: 'settings' }))}
              className="px-8 py-3 bg-amber-600 text-white font-black rounded-xl hover:bg-amber-700 transition-all"
            >
              Ayarlara Git & Bağlan
            </button>
          </div>
        )}

        {state.token && state.view !== 'settings' && (
          <nav className="flex items-center gap-6 mb-8 text-xs font-black text-slate-400">
            <button 
              onClick={() => setState(prev => ({ ...prev, view: 'overview', selectedUrl: undefined, selectedQuery: undefined }))}
              className={`hover:text-indigo-600 uppercase tracking-[0.2em] transition-all relative py-1 ${state.view === 'overview' ? 'text-indigo-600' : ''}`}
            >
              Genel Bakış
              {state.view === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in slide-in-from-left duration-300"></div>}
            </button>
            <button 
              onClick={() => setState(prev => ({ ...prev, view: 'comparison', selectedUrl: undefined, selectedQuery: undefined }))}
              className={`hover:text-indigo-600 uppercase tracking-[0.2em] transition-all relative py-1 ${state.view === 'comparison' || state.view === 'comparisonDetail' ? 'text-indigo-600' : ''}`}
            >
              Yükselenler/Düşenler
              {(state.view === 'comparison' || state.view === 'comparisonDetail') && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in slide-in-from-left duration-300"></div>}
            </button>
            <button 
              onClick={() => setState(prev => ({ ...prev, view: 'pageDetail', selectedUrl: undefined, selectedQuery: undefined }))}
              className={`hover:text-indigo-600 uppercase tracking-[0.2em] transition-all relative py-1 ${state.view === 'pageDetail' ? 'text-indigo-600' : ''}`}
            >
              Sayfa Analizi
              {state.view === 'pageDetail' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in slide-in-from-left duration-300"></div>}
            </button>
            
            {(state.view === 'queryDetail') && (
              <>
                <span className="text-slate-200">/</span>
                <span className="truncate max-w-[200px] text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                  Sorgu: {state.selectedQuery}
                </span>
              </>
            )}
            
            {state.view === 'comparisonDetail' && state.comparisonDetail && (
              <>
                <span className="text-slate-200">/</span>
                <span className="text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm uppercase tracking-widest">
                  Detaylı Liste
                </span>
              </>
            )}
          </nav>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-bold flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {state.view === 'settings' ? (
          <SettingsView config={state.config} token={state.token} onSave={handleConfigUpdate} onConnect={handleConnect} />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-[6px] border-indigo-50 rounded-full"></div>
              <div className="absolute top-0 w-20 h-20 border-[6px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-slate-800 font-black text-xl tracking-tight">BigQuery Verisi İşleniyor</p>
              <p className="text-slate-400 text-sm font-medium">Bu işlem veri kümenizin boyutuna göre birkaç saniye sürebilir...</p>
            </div>
          </div>
        ) : (
          state.token && (
            <>
              {state.view === 'overview' && data && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <StatsGrid stats={data.summary} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-xl font-black text-slate-800 tracking-tight">En İyi Sayfalar</h2>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Trafik Liderleri</p>
                        </div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-black uppercase tracking-widest">Tıklama Bazlı</span>
                      </div>
                      <DataTable<PageStats> 
                        data={data.pages} 
                        columns={[
                          { 
                            header: 'SAYFA URL', 
                            accessor: (item) => <span className="text-indigo-600 hover:underline font-bold transition-all">{item.url}</span>,
                            className: 'max-w-[240px] overflow-hidden text-ellipsis font-mono text-xs'
                          },
                          { header: 'TIKLAMA', accessor: (item) => <span className="font-black text-slate-900">{item.clicks.toLocaleString()}</span> },
                          { header: 'POZ.', accessor: (item) => <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${item.avgPosition <= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.avgPosition.toFixed(1)}</span> },
                        ]}
                        onRowClick={(item) => handlePageClick(item.url)}
                      />
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-xl font-black text-slate-800 tracking-tight">Popüler Sorgular</h2>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Kullanıcı Niyeti</p>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-black uppercase tracking-widest">Arama Hacmi</span>
                      </div>
                      <DataTable<QueryStats> 
                        data={data.queries} 
                        columns={[
                          { 
                            header: 'ARAMA SORGUSU', 
                            accessor: (item) => <span className="text-slate-800 hover:text-emerald-600 font-bold transition-all underline decoration-slate-100 underline-offset-4">{item.query}</span>
                          },
                          { header: 'TIKLAMA', accessor: (item) => <span className="font-black text-slate-900">{item.clicks.toLocaleString()}</span> },
                          { header: 'CTR', accessor: (item) => <span className="font-bold text-slate-500">{item.ctr.toFixed(1)}%</span> },
                        ]}
                        onRowClick={(item) => handleQueryClick(item.query)}
                      />
                    </div>
                  </div>
                </section>
              )}

              {state.view === 'comparison' && (
                <ComparisonView 
                  data={comparisonData} 
                  type={comparisonType}
                  onTypeChange={(t) => setComparisonType(t)}
                  activeRange={comparisonPeriod.active} 
                  prevRange={comparisonPeriod.prev} 
                  onItemClick={(key) => comparisonType === 'url' ? handlePageClick(key) : handleQueryClick(key)}
                  onViewDetail={(type, metric, trend) => setState(prev => ({ ...prev, view: 'comparisonDetail', comparisonDetail: { type, metric, trend } }))}
                />
              )}
              
              {state.view === 'comparisonDetail' && state.comparisonDetail && (
                <ComparisonDetailView 
                  data={comparisonData}
                  type={state.comparisonDetail.type}
                  metric={state.comparisonDetail.metric}
                  trend={state.comparisonDetail.trend}
                  onBack={() => setState(prev => ({ ...prev, view: 'comparison' }))}
                  onItemClick={(key) => state.comparisonDetail?.type === 'url' ? handlePageClick(key) : handleQueryClick(key)}
                />
              )}

              {state.view === 'pageDetail' && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {state.selectedUrl && detailData.length > 0 && (
                    <InsightBox context={`URL: ${state.selectedUrl}`} data={detailData} language={state.config.aiLanguage} />
                  )}
                  
                  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm mb-10 w-full">
                    <div className="mb-10 w-full">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sayfa Performans Analizi</h2>
                        {state.selectedUrl && (
                          <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-full border border-indigo-100">
                            Aktif Sayfa Modu
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 w-full">
                        <div className="relative flex-grow group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Analiz etmek istediğiniz URL'i girin..."
                            value={editableUrl}
                            onChange={(e) => setEditableUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                            className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-mono text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-inner placeholder:text-slate-400"
                          />
                          {state.selectedUrl && (
                            <a 
                              href={state.selectedUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Yeni sekmede aç"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          )}
                        </div>
                        <button 
                          onClick={handleFetchUrl}
                          className="px-8 py-4 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex-shrink-0"
                        >
                          Getir
                        </button>
                      </div>
                    </div>

                    {!state.selectedUrl ? (
                      <div className="py-24 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-400">Veri Bekleniyor</h3>
                        <p className="text-slate-400 max-w-xs mx-auto mt-2">Yukarıdaki kutucuğa bir URL girerek BigQuery analizini hemen başlatabilirsiniz.</p>
                      </div>
                    ) : (
                      <DataTable<QueryStats> 
                        data={detailData}
                        columns={[
                          { header: 'ARAMA SORGUSU', accessor: (item) => <span className="text-indigo-600 font-black">{item.query}</span> },
                          { 
                            header: (
                              <button onClick={() => toggleSort('clicks')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase">
                                TIKLAMA {sortConfig.col === 'clicks' && (sortConfig.dir === 'DESC' ? '↓' : '↑')}
                              </button>
                            ) as any, 
                            accessor: (item) => item.clicks.toLocaleString() 
                          },
                          { 
                            header: (
                              <button onClick={() => toggleSort('impressions')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase">
                                GÖSTERİM {sortConfig.col === 'impressions' && (sortConfig.dir === 'DESC' ? '↓' : '↑')}
                              </button>
                            ) as any, 
                            accessor: (item) => item.impressions.toLocaleString() 
                          },
                          { 
                            header: (
                              <button onClick={() => toggleSort('ctr')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase">
                                CTR {sortConfig.col === 'ctr' && (sortConfig.dir === 'DESC' ? '↓' : '↑')}
                              </button>
                            ) as any, 
                            accessor: (item) => <span className="font-bold">{item.ctr.toFixed(2)}%</span> 
                          },
                          { 
                            header: (
                              <button onClick={() => toggleSort('avgPosition')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase">
                                AVG. POS. {sortConfig.col === 'avgPosition' && (sortConfig.dir === 'DESC' ? '↓' : '↑')}
                              </button>
                            ) as any, 
                            accessor: (item) => <span className="font-black bg-slate-50 px-3 py-1 rounded-lg">{item.avgPosition.toFixed(1)}</span> 
                          },
                        ]}
                        onRowClick={(item) => handleQueryClick(item.query)}
                      />
                    )}
                  </div>
                </section>
              )}

              {state.view === 'queryDetail' && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <InsightBox context={`Sorgu: ${state.selectedQuery}`} data={detailData} language={state.config.aiLanguage} />
                  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm mb-10">
                    <div className="mb-10">
                      <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em] mb-2">Arama Niyeti Analizi</p>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        "{state.selectedQuery}"
                        <span className="text-sm font-bold bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full border border-emerald-100">Sorgusu İçin Yarışan Sayfalar</span>
                      </h2>
                    </div>
                    <DataTable<PageStats> 
                      data={detailData}
                      columns={[
                        { header: 'URL', accessor: (item) => <span className="text-emerald-600 font-bold truncate inline-block max-w-[400px] font-mono text-xs">{item.url}</span> },
                        { header: 'TIKLAMA', accessor: (item) => <span className="font-black">{item.clicks.toLocaleString()}</span> },
                        { header: 'GÖSTERİM', accessor: (item) => item.impressions.toLocaleString() },
                        { header: 'CTR', accessor: (item) => `${item.ctr.toFixed(2)}%` },
                        { header: 'POZİSYON', accessor: (item) => <span className="font-bold bg-slate-50 px-3 py-1 rounded-lg">{item.avgPosition.toFixed(1)}</span> },
                      ]}
                      onRowClick={(item) => handlePageClick(item.url)}
                    />
                  </div>
                </section>
              )}
            </>
          )
        )}
      </main>
      
      <footer className="max-w-7xl mx-auto px-6 py-12 text-center border-t border-slate-100 mt-20">
        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${state.token ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {state.token ? 'BigQuery Engine Connected' : 'Configuration Required'}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-100"></div>
          <p className="text-[10px] font-bold text-slate-300 italic">Project: {state.config.projectId || 'None'}</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
