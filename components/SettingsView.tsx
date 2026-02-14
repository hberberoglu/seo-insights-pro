
import React, { useState } from 'react';
import { BQConfig } from '../types';

interface SettingsViewProps {
  config: BQConfig;
  token?: string;
  onSave: (config: BQConfig) => void;
  onConnect: (token: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config, token, onSave, onConnect }) => {
  const [localConfig, setLocalConfig] = useState<BQConfig>(config);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleLogout = () => {
    if (confirm("Bağlantıyı kesmek istediğinize emin misiniz?")) {
      window.location.reload(); // Simple way to clear token and state for this demo
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Veri Kaynağı Ayarları</h2>
            <p className="text-slate-500 font-medium">BigQuery bağlantısı ve Search Console yapılandırması.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${token ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
              <div className={`w-2 h-2 rounded-full ${token ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
              <span className="text-xs font-black uppercase tracking-widest">{token ? 'Bağlı' : 'Bağlantı Yok'}</span>
            </div>
            {token && (
              <button onClick={handleLogout} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Oturumu Kapat</button>
            )}
          </div>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Google OAuth Client ID</label>
              <input
                type="text"
                name="clientId"
                value={localConfig.clientId}
                onChange={handleChange}
                placeholder="örn: 12345678-abcd.apps.googleusercontent.com"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-mono text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GCP Project ID</label>
              <input
                type="text"
                name="projectId"
                value={localConfig.projectId}
                onChange={handleChange}
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
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
              <input
                type="text"
                name="location"
                value={localConfig.location}
                onChange={handleChange}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AI Analiz Dili</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setLocalConfig(prev => ({ ...prev, aiLanguage: 'tr' }))}
                  className={`flex-1 py-3.5 px-5 rounded-2xl font-bold border-2 transition-all ${localConfig.aiLanguage === 'tr' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                >
                  Türkçe
                </button>
                <button
                  type="button"
                  onClick={() => setLocalConfig(prev => ({ ...prev, aiLanguage: 'en' }))}
                  className={`flex-1 py-3.5 px-5 rounded-2xl font-bold border-2 transition-all ${localConfig.aiLanguage === 'en' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                >
                  İngilizce
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-100">
            <button
              onClick={() => {
                onSave(localConfig);
                alert("Ayarlar kaydedildi.");
              }}
              className="w-full px-8 py-4 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Yapılandırmayı Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
