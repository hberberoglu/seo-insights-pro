
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
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleGoogleLogin = () => {
    if (!localConfig.clientId) {
      alert("Lütfen önce Google Cloud Console'dan aldığınız Client ID'yi girin.");
      return;
    }

    setIsLoggingIn(true);
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: localConfig.clientId,
      scope: 'https://www.googleapis.com/auth/bigquery.readonly',
      callback: (response: any) => {
        setIsLoggingIn(false);
        if (response.access_token) {
          onConnect(response.access_token);
          onSave(localConfig);
        }
      },
    });
    client.requestAccessToken();
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Veri Kaynağı Ayarları</h2>
            <p className="text-slate-500 font-medium">BigQuery bağlantısı ve Search Console yapılandırması.</p>
          </div>
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${token ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
            <div className={`w-2 h-2 rounded-full ${token ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
            <span className="text-xs font-black uppercase tracking-widest">{token ? 'Bağlı' : 'Bağlantı Yok'}</span>
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
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-100">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isLoggingIn ? 'Bağlanıyor...' : 'Google ile Bağlan'}
            </button>
            <button
              onClick={() => onSave(localConfig)}
              className="flex-1 px-8 py-4 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              Yapılandırmayı Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
