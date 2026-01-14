import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "") {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePosterSlogan = async (productInfo: string): Promise<string[]> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: `คุณคือผู้เชี่ยวชาญด้านการตลาด ช่วยคิดคำโปรโมทสั้นๆ กระชับ สำหรับ: "${productInfo}" ขอ 5 แบบที่แตกต่างกัน ส่งกลับเป็น JSON Array ของ String เท่านั้น`
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
    return text ? JSON.parse(text) : ["สินค้าคุณภาพดี", "โปรโมชั่นพิเศษ"];
  } catch (e: any) {
    console.error("Slogan Error:", e);
    return ["สินค้าคุณภาพดี", "โปรโมชั่นพิเศษ", "ของเด็ดเมืองน่าน", "พรีเมียมเกรด A", "คุ้มค่าราคาประหยัด"];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  // บังคับเลือกโมเดลให้ชัดเจน
  const modelName = config.highQuality === true ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  console.log(`[AI] กำลังใช้งานโมเดล: ${modelName} (โหมดคุณภาพสูง: ${config.highQuality})`);
  
  const ai = getAIClient();
  const parts: any[] = [];
  
  const stylePrompt = config.style || "Professional product photography";
  const finalPrompt = `Professional commercial poster for "${config.prompt}". 
    Text context in poster: "${config.posterText || ''}". 
    Style: ${stylePrompt}. 
    High resolution, 8k, studio lighting, product display. 
    ${config.removeBackground ? 'Isolated product on a beautiful new artistic background matching the style.' : ''}`;

  if (config.baseImage) {
    const base64Data = config.baseImage.split(',')[1] || config.baseImage;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
  }
  
  parts.push({ text: finalPrompt });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any,
          ...(modelName === 'gemini-3-pro-image-preview' ? { imageSize: '1K' } : {})
        }
      }
    });

    const firstCandidateParts = response.candidates?.[0]?.content?.parts;
    if (firstCandidateParts) {
      for (const part of firstCandidateParts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("AI_RETURNED_NO_IMAGE");
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    throw error;
  }
};

export const openKeySelector = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};