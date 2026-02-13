
import React, { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';

interface InsightBoxProps {
  context: string;
  data: any[];
}

export const InsightBox: React.FC<InsightBoxProps> = ({ context, data }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchInsight = async () => {
    setLoading(true);
    const result = await GeminiService.analyzeData(context, data);
    setInsight(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsight();
  }, [context, data]);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-6 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h3 className="text-lg font-bold text-slate-800">AI SEO Insights</h3>
      </div>
      
      {loading ? (
        <div className="flex items-center gap-3 text-slate-500 animate-pulse">
          <div className="w-4 h-4 rounded-full bg-indigo-400"></div>
          <span>Generating strategic recommendations...</span>
        </div>
      ) : (
        <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed">
          {insight.split('\n').map((line, i) => (
            <p key={i} className="mb-2 last:mb-0">{line}</p>
          ))}
        </div>
      )}

      <button 
        onClick={fetchInsight}
        disabled={loading}
        className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh Analysis
      </button>
    </div>
  );
};
