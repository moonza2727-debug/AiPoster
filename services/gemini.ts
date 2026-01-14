
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// ดึง AI Instance พร้อม Key ล่าสุด
const getAI = () => {
  const apiKey = process.env.API_KEY;
  // ตรวจสอบทั้งกรณีเป็นค่าว่าง หรือเป็น String "undefined" ที่บาง Environment ส่งมา
  if (!apiKey || apiKey === "undefined" || apiKey.length < 5) {
    throw new Error("MISSING_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePosterSlogan = async (productInfo: string): Promise<string[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: `Generate 5 catchy marketing slogans in Thai for: "${productInfo}". Return as JSON array of strings.`
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
    return JSON.parse(response.text || "[]");
  } catch (e: any) {
    if (e.message === "MISSING_KEY") throw e;
    if (e?.message?.includes("429")) throw new Error("QUOTA_EXCEEDED");
    throw e;
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  try {
    const ai = getAI();
    
    // แปล Prompt เป็นอังกฤษเพื่อผลลัพธ์ที่ดีขึ้น
    let enhancedPrompt = config.prompt;
    try {
      const transRes = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [{
            text: `Translate to English for AI Image Gen: "${config.prompt}"`
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

    contentsParts.push({ 
      text: `Style: ${config.style}. Prompt: ${enhancedPrompt}. Product poster, professional studio lighting, 8k resolution.` 
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: contentsParts }],
      config: { imageConfig: { aspectRatio: config.aspectRatio as any } }
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (part?.inlineData?.data) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
    throw new Error("IMAGE_GEN_FAILED");
  } catch (error: any) {
    if (error.message === "MISSING_KEY") throw error;
    if (error?.message?.includes("Requested entity was not found")) throw new Error("KEY_INVALID");
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
  const key = process.env.API_KEY;
  return !!(key && key !== "undefined" && key.length > 5);
};

export const openKeySelector = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) {
    try {
      await win.aistudio.openSelectKey();
      return true;
    } catch (e) {}
  }
  return false;
};
