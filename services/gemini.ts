
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// Fix: Initialize GoogleGenAI with process.env.API_KEY directly as required by guidelines
const getAIClient = () => {
  if (!process.env.API_KEY || process.env.API_KEY === "") {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    // Fix: Access .text property directly (not as a method)
    return JSON.parse(response.text || "[]");
  } catch (e: any) {
    console.error("Slogan Error:", e);
    if (e.message === "MISSING_API_KEY") throw e;
    return ["สินค้าคุณภาพดี", "โปรโมชั่นพิเศษ", "ของเด็ดเมืองน่าน", "พรีเมียมเกรด A", "คุ้มค่าราคาประหยัด"];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = getAIClient();
  const parts: any[] = [];
  
  const stylePrompt = config.style || "Professional product photography";
  const finalPrompt = `Professional commercial poster for "${config.prompt}". 
    Text context: "${config.posterText || ''}". 
    Style: ${stylePrompt}. 
    High resolution, 8k, studio lighting. 
    ${config.removeBackground ? 'Isolated product on a beautiful new artistic background.' : ''}`;

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
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any
        }
      }
    });

    // Fix: Iterate through parts to find the image part, as it might not be the first one
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI_RETURNED_NO_IMAGE");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const openKeySelector = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};
