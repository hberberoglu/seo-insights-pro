
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  static async analyzeData(context: string, data: any[], language: 'en' | 'tr' = 'tr'): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const languageInstruction = language === 'tr' 
      ? "Lütfen analizi Türkçe dilinde yap." 
      : "Please perform the analysis in English.";

    const prompt = `
      Analyze the following SEO performance data for: ${context}.
      ${languageInstruction}
      
      Identify:
      1. Top performing assets.
      2. Underperforming items with high impressions but low clicks (CTR issues).
      3. Items in striking distance (position 11-20).
      4. Actionable SEO advice (e.g., content refresh, meta title optimization).
      
      Data:
      ${JSON.stringify(data.slice(0, 10), null, 2)}
      
      Return a concise, professional summary in Markdown.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || (language === 'tr' ? "Analiz sonucu bulunamadı." : "No insights available.");
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return language === 'tr' 
        ? "Şu anda AI analizleri oluşturulamadı." 
        : "Could not generate AI insights at this time.";
    }
  }
}
