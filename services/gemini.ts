
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// ฟังก์ชันสร้าง Client โดยใช้ค่าที่ถูกฉีดมาจาก Vite
// ตามข้อกำหนด: สร้าง instance ใหม่ทุกครั้งเพื่อให้ใช้ Key ล่าสุดที่ผู้ใช้อาจเลือกใหม่ได้
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "") {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

// ใช้ gemini-3-flash-preview สำหรับงานข้อความที่ต้องการความแม่นยำและการสรุปผล
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
    // ดึงค่าจาก .text property (ไม่ใช่ method)
    return JSON.parse(response.text || "[]");
  } catch (e: any) {
    console.error("Slogan Error:", e);
    if (e.message === "MISSING_API_KEY") throw e;
    return ["สินค้าคุณภาพดี", "โปรโมชั่นพิเศษ", "ของเด็ดเมืองน่าน", "พรีเมียมเกรด A", "คุ้มค่าราคาประหยัด"];
  }
};

// เลือกโมเดลตามคุณภาพที่ผู้ใช้ต้องการ: gemini-3-pro-image-preview (2K) หรือ gemini-2.5-flash-image
export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const modelName = config.highQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
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
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any,
          // imageSize มีเฉพาะใน gemini-3-pro-image-preview
          ...(modelName === 'gemini-3-pro-image-preview' ? { imageSize: '2K' } : {})
        }
      }
    });

    // วนลูปตรวจสอบ part เพื่อหา inlineData (รูปภาพ) ตามแนวทางปฏิบัติ
    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
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
