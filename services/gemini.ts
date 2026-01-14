
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// สร้าง Instance ใหม่ทุกครั้งที่เรียกใช้ เพื่อใช้ Key ล่าสุดจาก process.env.API_KEY
const getAI = () => {
  const apiKey = process.env.API_KEY;
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
          text: `คุณคือผู้เชี่ยวชาญด้านการตลาด ช่วยคิดคำโปรโมทสินค้าสั้นๆ 5 แบบ สำหรับสินค้า: "${productInfo}" ตอบกลับเป็น JSON Array (ภาษาไทย)`
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
    console.error("Slogan Error:", e);
    return ["สินค้าคุณภาพพรีเมียม", "โปรโมชั่นพิเศษวันนี้", "ของดีเมืองน่าน", "คุณภาพดีที่สุด", "คุ้มค่าเกินราคา"];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = getAI();
  
  const parts: any[] = [];
  if (config.baseImage) {
    const base64Data = config.baseImage.includes(',') ? config.baseImage.split(',')[1] : config.baseImage;
    parts.push({
      inlineData: { data: base64Data, mimeType: 'image/png' }
    });
  }
  
  const promptText = `Professional product advertisement poster for "${config.prompt}". Style: ${config.style}. ${config.removeBackground ? 'Place product in a clean new studio environment.' : ''} 8k, high quality.`;
  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: config.aspectRatio as any }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI ไม่ส่งรูปภาพกลับมา");
  } catch (error: any) {
    if (error?.message?.includes("Requested entity was not found")) {
      throw new Error("KEY_INVALID");
    }
    throw error;
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio?.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  return !!(process.env.API_KEY && process.env.API_KEY !== "undefined");
};

export const openKeySelector = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) {
    await win.aistudio.openSelectKey();
    // ห้าม reload เพื่อไม่ให้สถานะใน App หลุด
  }
};
