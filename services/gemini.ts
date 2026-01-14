
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// ฟังก์ชันดึง AI Client ที่ทนทานต่อสภาพแวดล้อมที่แตกต่างกัน
const getAIClient = () => {
  // ตรวจสอบทั้งใน process.env และในตัวแปร Global
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || (window as any).API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
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
    return JSON.parse(response.text || "[]");
  } catch (e: any) {
    console.error("Slogan Error:", e);
    if (e.message === "KEY_NOT_FOUND") throw e;
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

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI_NO_IMAGE");
  } catch (error: any) {
    const errorMsg = error?.message || "";
    if (errorMsg.includes("Requested entity was not found") || 
        errorMsg.includes("404") || 
        errorMsg.includes("401") || 
        errorMsg.includes("API_KEY_INVALID")) {
      throw new Error("KEY_INVALID");
    }
    throw error;
  }
};

export const openKeySelector = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) {
    await win.aistudio.openSelectKey();
  } else {
    // กรณีอยู่บนเว็บทั่วไป ให้แนะนำวิธีตั้งค่า
    const msg = "ไม่พบระบบเลือก Key อัตโนมัติ (แอปทำงานนอก AI Studio)\n\nกรุณาตั้งค่า API_KEY ใน Environment Variables ของ Hosting ของคุณ หรือติดต่อผู้ดูแลระบบ";
    console.warn(msg);
    alert(msg);
  }
};

export const checkKeyStatus = async (): Promise<boolean> => {
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || (window as any).API_KEY;
  return !!(apiKey && apiKey !== "undefined" && apiKey !== "");
};
