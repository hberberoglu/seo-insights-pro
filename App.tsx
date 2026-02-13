
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ViewType, AppState, SummaryStats, PageStats, QueryStats, BQConfig } from './types';
import { DataService } from './services/dataService';
import { StatsGrid } from './components/StatsGrid';
import { DataTable } from './components/DataTable';
import { InsightBox } from './components/InsightBox';
import { SettingsView } from './components/SettingsView';

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
  // Ensure default for legacy saved configs
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

  const loadData = useCallback(async () => {
    if (state.view === 'settings' || !state.token || !state.config.projectId) return;

    setLoading(true);
    setError(null);
    try {
      if (state.view === 'overview') {
        const result = await DataService.getOverview(state.config, state.token, state.startDate, state.endDate);
        setData(result);
      } else if (state.view === 'pageDetail' && state.selectedUrl) {
        const result = await DataService.getUrlDetails(state.config, state.token, state.selectedUrl, state.startDate, state.endDate);
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
  }, [state.view, state.startDate, state.endDate, state.selectedUrl, state.selectedQuery, state.token, state.config]);

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
            onClick={() => setState(prev => ({ ...prev, view: 'overview' }))}
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
              onClick={() => setState(prev => ({ ...prev, view: state.view === 'settings' ? 'overview' : 'settings' }))}
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
          <nav className="flex items-center gap-2 mb-8 text-xs font-bold text-slate-400">
            <button 
              onClick={() => setState(prev => ({ ...prev, view: 'overview' }))}
              className={`hover:text-indigo-600 uppercase tracking-widest transition-colors ${state.view === 'overview' ? 'text-indigo-600 underline decoration-2 underline-offset-4' : ''}`}
            >
              Genel Bakış
            </button>
            {state.view !== 'overview' && (
              <>
                <span className="text-slate-200">/</span>
                <span className="truncate max-w-[200px] text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                  {state.view === 'pageDetail' ? `Sayfa: ${state.selectedUrl}` : `Sorgu: ${state.selectedQuery}`}
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

              {state.view === 'pageDetail' && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <InsightBox context={`URL: ${state.selectedUrl}`} data={detailData} language={state.config.aiLanguage} />
                  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm mb-10">
                    <div className="mb-10 flex items-start justify-between">
                      <div className="max-w-3xl">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Sayfa Performans Analizi</h2>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 text-xs font-bold font-mono overflow-hidden group hover:bg-white hover:border-indigo-200 transition-all">
                          <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          <span className="truncate">{state.selectedUrl}</span>
                        </div>
                      </div>
                    </div>
                    <DataTable<QueryStats> 
                      data={detailData}
                      columns={[
                        { header: 'ARAMA SORGUSU', accessor: (item) => <span className="text-indigo-600 font-black">{item.query}</span> },
                        { header: 'TIKLAMA', accessor: (item) => item.clicks.toLocaleString() },
                        { header: 'GÖSTERİM', accessor: (item) => item.impressions.toLocaleString() },
                        { header: 'CTR', accessor: (item) => <span className="font-bold">{item.ctr.toFixed(2)}%</span> },
                        { header: 'AVG. POS.', accessor: (item) => <span className="font-black bg-slate-50 px-3 py-1 rounded-lg">{item.avgPosition.toFixed(1)}</span> },
                      ]}
                      onRowClick={(item) => handleQueryClick(item.query)}
                    />
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
