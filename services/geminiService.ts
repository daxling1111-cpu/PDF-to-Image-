
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AIAnalysis } from "../types";

export const analyzePDFContent = async (base64Image: string): Promise<AIAnalysis> => {
  // Create a new instance right before the call to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = "This is the first page of a PDF document. Analyze it and provide a JSON summary. " +
                 "Include a suggested professional title, a 2-sentence summary, and 3-5 key points found in this document.";

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Image.split(',')[1],
          },
        },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          suggestedTitle: { type: Type.STRING },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["summary", "suggestedTitle", "keyPoints"]
      }
    }
  });

  // Access text as a property, not a method
  const text = response.text || "{}";
  return JSON.parse(text) as AIAnalysis;
};
