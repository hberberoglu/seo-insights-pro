
import React, { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { marked } from 'marked';

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

  // Configure marked for safe and clean HTML output
  const renderMarkdown = (text: string) => {
    try {
      return { __html: marked.parse(text) };
    } catch (e) {
      console.error("Markdown parse error", e);
      return { __html: text };
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/30 border border-indigo-100 rounded-[2.5rem] p-8 mb-10 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-100 ring-4 ring-indigo-50">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">{currentLabels.title}</h3>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Gemini 3 Intelligence</p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm font-bold text-indigo-600 animate-pulse">{currentLabels.loading}</span>
        </div>
      ) : insight ? (
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div 
            className="prose prose-slate prose-indigo max-w-none text-slate-700 leading-relaxed mb-8 
                       prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
                       prose-strong:text-indigo-700 prose-strong:font-black
                       prose-ul:list-disc prose-li:marker:text-indigo-400
                       prose-p:mb-4 last:prose-p:mb-0"
            dangerouslySetInnerHTML={renderMarkdown(insight)}
          />
          <div className="pt-6 border-t border-indigo-50 flex justify-between items-center">
            <button 
              onClick={fetchInsight}
              className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-2 uppercase tracking-widest transition-all group"
            >
              <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {currentLabels.refresh}
            </button>
            <span className="text-[10px] font-bold text-slate-300 italic tracking-wider">AI analysis is generated based on current period performance.</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-8 px-10 bg-white border border-indigo-50 rounded-[2rem] shadow-inner animate-in fade-in duration-500">
          <div className="max-w-md">
            <p className="text-sm font-bold text-slate-600 leading-relaxed">
              {currentLabels.description}
            </p>
          </div>
          <button 
            onClick={fetchInsight}
            className="w-full md:w-auto px-10 py-4 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all"
          >
            {currentLabels.generate}
          </button>
        </div>
      )}
    </div>
  );
};
