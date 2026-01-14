
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// ฟังก์ชันดึง API Key ที่ปลอดภัยที่สุด
const getSafeKey = (): string | undefined => {
  try {
    return process.env.API_KEY;
  } catch (e) {
    return undefined;
  }
};

const getAI = () => {
  const apiKey = getSafeKey();
  if (!apiKey) throw new Error("MISSING_KEY");
  return new GoogleGenAI({ apiKey });
};

export const generatePosterSlogan = async (productInfo: string): Promise<string[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: `Generate 5 catchy, short, and striking marketing slogans in Thai for this product: "${productInfo}". 
          The slogans should be suitable for a commercial poster. Focus on the product's identity and premium feel. 
          Keep them under 10 words each. Return as a JSON array of strings.`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    const text = response.text;
    return text ? JSON.parse(text.trim()) : [];
  } catch (e: any) {
    if (e?.message?.includes("429")) throw new Error("QUOTA_EXCEEDED");
    throw e;
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = getAI();
  let enhancedPrompt = config.prompt;
  
  try {
    const transRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: `Enhance this Thai description into an English high-end product photography prompt: "${config.prompt}".`
        }]
      }],
    });
    enhancedPrompt = transRes.text || config.prompt;
  } catch (e) {}

  const contentsParts: any[] = [];
  if (config.baseImage) {
    const base64Data = config.baseImage.includes(',') ? config.baseImage.split(',')[1] : config.baseImage;
    contentsParts.push({ inlineData: { data: base64Data, mimeType: 'image/png' } });
  }

  const bgPrompt = config.removeBackground 
    ? "Studio high-end product photography, luxurious background, professional lighting." 
    : "Enhance lighting and aesthetics.";

  contentsParts.push({ text: `Style: ${config.style}. Prompt: ${enhancedPrompt}. ${bgPrompt}` });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: contentsParts }],
      config: { imageConfig: { aspectRatio: config.aspectRatio as any } }
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("API_RETURNED_NO_IMAGE");
  } catch (error: any) {
    if (error?.message?.includes("Requested entity was not found")) throw new Error("KEY_RESET");
    throw error;
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio?.hasSelectedApiKey) {
    try {
      if (await win.aistudio.hasSelectedApiKey()) return true;
    } catch (e) {}
  }
  return !!getSafeKey();
};

export const openKeySelector = async () => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) {
    try {
      await win.aistudio.openSelectKey();
      return true;
    } catch (e) {}
  }
  // หากไม่มี window.aistudio แสดงว่ารันใน environment ปกติที่มี Key ฝังไว้อยู่แล้ว
  return false;
};
