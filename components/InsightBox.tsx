
import React, { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';

interface InsightBoxProps {
  context: string;
  data: any[];
  language: 'en' | 'tr';
}

export const InsightBox: React.FC<InsightBoxProps> = ({ context, data, language }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchInsight = async () => {
    if (!data || data.length === 0) return;
    setLoading(true);
    const result = await GeminiService.analyzeData(context, data, language);
    setInsight(result);
    setLoading(false);
  };

  // Reset insight when context (URL or Query) changes
  useEffect(() => {
    setInsight('');
  }, [context]);

  const labels = {
    tr: {
      title: 'AI SEO Analizi',
      loading: 'Stratejik öneriler oluşturuluyor...',
      generate: 'Analizi Başlat',
      refresh: 'Analizi Yenile',
      description: 'Bu sayfa/sorgu için yapay zeka destekli SEO önerilerini görüntülemek için butona tıklayın.'
    },
    en: {
      title: 'AI SEO Insights',
      loading: 'Generating strategic recommendations...',
      generate: 'Start Analysis',
      refresh: 'Refresh Analysis',
      description: 'Click the button to view AI-powered SEO recommendations for this page/query.'
    }
  };

  const currentLabels = labels[language];

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-8 mb-8 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-md shadow-indigo-100">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-black text-slate-800 tracking-tight">{currentLabels.title}</h3>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm font-bold text-indigo-600 animate-pulse">{currentLabels.loading}</span>
        </div>
      ) : insight ? (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed mb-6">
            {insight.split('\n').map((line, i) => (
              <p key={i} className="mb-2 last:mb-0">{line}</p>
            ))}
          </div>
          <button 
            onClick={fetchInsight}
            className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-2 uppercase tracking-widest transition-all group"
          >
            <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {currentLabels.refresh}
          </button>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-4 px-6 bg-white/50 border border-indigo-50/50 rounded-2xl animate-in fade-in duration-500">
          <p className="text-sm font-medium text-slate-500 max-w-md">
            {currentLabels.description}
          </p>
          <button 
            onClick={fetchInsight}
            className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            {currentLabels.generate}
          </button>
        </div>
      )}
    </div>
  );
};
