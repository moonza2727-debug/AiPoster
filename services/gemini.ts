
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// ฟังก์ชันสร้าง AI Client พร้อม Key ล่าสุด
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") {
    throw new Error("KEY_NOT_FOUND");
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
          text: `คุณคือผู้เชี่ยวชาญด้านการตลาดและ Copywriter ภาษาไทย ช่วยคิดคำโปรโมทสั้นๆ กระชับ โดนใจ สำหรับสินค้า: "${productInfo}" ขอ 5 แบบที่แตกต่างกัน ส่งกลับเป็น JSON Array ของ String เท่านั้น`
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
  } catch (e) {
    console.error("Slogan Error:", e);
    return ["สินค้าคุณภาพดี", "โปรโมชั่นพิเศษ", "ของเด็ดเมืองน่าน", "พรีเมียมเกรด A", "คุ้มค่าราคาประหยัด"];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = getAIClient();
  
  const parts: any[] = [];
  
  // จัดเตรียม Prompt ตามสไตล์ที่เลือก
  const stylePrompt = config.style || "Professional product photography";
  const finalPrompt = `Professional commercial poster for "${config.prompt}". 
    Text context: "${config.posterText || ''}". 
    Style: ${stylePrompt}. 
    High resolution, 8k, studio lighting, masterpiece. 
    ${config.removeBackground ? 'The product should be isolated on a beautiful new background based on the style.' : ''}`;

  if (config.baseImage) {
    // ลบ prefix data:image/...;base64, ออกถ้ามี
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

    // ค้นหาไฟล์ภาพในผลลัพธ์
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("AI ไม่ได้ส่งรูปภาพกลับมา กรุณาลองใหม่อีกครั้ง");
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
  }
};
