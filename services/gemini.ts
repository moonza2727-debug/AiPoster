
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

export const generatePosterSlogan = async (productInfo: string): Promise<string[]> => {
  // สร้าง instance ใหม่ทุกครั้งเพื่อใช้ Key ล่าสุดจาก process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 catchy, short, and striking marketing slogans in Thai for this product: "${productInfo}". 
      The slogans should be suitable for a commercial poster. Focus on the product's identity and premium feel. 
      Keep them under 10 words each.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (e: any) {
    if (e?.message?.includes("429")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    return [];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash-image';
  
  let parts: any[] = [];
  
  if (config.baseImage) {
    const base64Data = config.baseImage.split(',')[1];
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
  }

  let instruction = `You are a world-class advertising creative director.
  TASK: Design a high-impact, professional marketing poster.
  STYLE: ${config.style}
  ENVIRONMENT: ${config.prompt}
  STRIKING TYPOGRAPHY: The text "${config.posterText || ''}" must be rendered in BOLD, PREMIUM 3D typography integrated into the scene.`;

  if (config.baseImage) {
    instruction += `\nPRODUCT INTEGRATION: ${config.removeBackground ? 'Extract product and place in studio.' : 'Blend naturally.'}`;
  }

  parts.push({ text: instruction });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any
        }
      }
    });

    let imageUrl = '';
    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("EMPTY_RESPONSE");
    return imageUrl;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes("429") || error?.message?.includes("entity was not found")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error(error.message || "UNKNOWN_ERROR");
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  // @ts-ignore
  if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
    // @ts-ignore
    return await window.aistudio.hasSelectedApiKey();
  }
  return !!process.env.API_KEY;
};

export const openKeySelector = async () => {
  // @ts-ignore
  if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    return true;
  }
  return false;
};
