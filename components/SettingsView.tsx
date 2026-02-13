
import React from 'react';
import { BQConfig } from '../types';

interface SettingsViewProps {
  config: BQConfig;
  onSave: (config: BQConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config, onSave }) => {
  const [localConfig, setLocalConfig] = React.useState<BQConfig>(config);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalConfig(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-10 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Veri Kaynağı Ayarları</h2>
          <p className="text-slate-500 font-medium">BigQuery bağlantısı ve Search Console veri kümesi yapılandırması.</p>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GCP Project ID</label>
              <input
                type="text"
                name="projectId"
                value={localConfig.projectId}
                onChange={handleChange}
                placeholder="örn: my-seo-project-123"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dataset ID</label>
              <input
                type="text"
                name="datasetId"
                value={localConfig.datasetId}
                onChange={handleChange}
                placeholder="örn: searchconsole"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Table Name</label>
              <input
                type="text"
                name="tableId"
                value={localConfig.tableId}
                onChange={handleChange}
                placeholder="örn: searchdata_url_impression"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Location</label>
              <input
                type="text"
                name="location"
                value={localConfig.location}
                onChange={handleChange}
                placeholder="örn: US veya EU"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-600 text-white p-2 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-indigo-900 uppercase tracking-wide mb-1">Güvenlik Notu</h4>
                <p className="text-sm text-indigo-700 leading-relaxed">
                  Girdiğiniz BigQuery bilgileri yalnızca bu tarayıcıda saklanır. Uygulama, BigQuery verilerinize erişmek için tarayıcınızın Google kimlik doğrulamasını (OAuth2) kullanacaktır.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                API Ready
              </div>
              <div className="text-xs text-slate-400 font-medium italic">Ayarlar otomatik olarak yerel hafızaya kaydedilir.</div>
            </div>
            <button
              onClick={() => onSave(localConfig)}
              className="px-8 py-3.5 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Yapılandırmayı Güncelle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
