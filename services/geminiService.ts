
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  // Initializing ai instance inside the static method to ensure the most current API key from environment is used.
  static async analyzeData(context: string, data: any[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Analyze the following SEO performance data for: ${context}.
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
      // response.text is a property, not a method.
      return response.text || "No insights available.";
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return "Could not generate AI insights at this time.";
    }
  }
}
