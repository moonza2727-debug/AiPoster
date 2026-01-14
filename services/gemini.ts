
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// ดึง AI Instance พร้อมดึงค่า Key สดๆ ณ วินาทีที่เรียกใช้งาน
const getAI = () => {
  const apiKey = process.env.API_KEY;
  // ตรวจสอบกรณี Key ไม่มี หรือเป็นค่า undefined (string) ที่บางครั้งระบบส่งมา
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
          text: `ทำหน้าที่เป็นก๊อปปี้ไรเตอร์มืออาชีพ ช่วยคิดคำโฆษณาสั้นๆ (ไม่เกิน 10 คำ) สำหรับสินค้า: "${productInfo}" จำนวน 5 ข้อความ ให้น่าสนใจและเหมาะกับโปสเตอร์ขายของ ตอบกลับเป็นรูปแบบ JSON array ของ string เท่านั้น`
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
    if (e.message === "MISSING_KEY") throw e;
    console.error("Slogan Error:", e);
    return [];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  try {
    const ai = getAI();
    
    // พยายามขยาย Prompt เป็นภาษาอังกฤษเพื่อให้ AI เจนภาพได้สวยขึ้น
    let enhancedPrompt = config.prompt;
    try {
      const transRes = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [{
            text: `Optimize this product description for professional photography AI image generation: "${config.prompt}". Focus on lighting, high-end materials, and studio setup. Style: ${config.style}.`
          }]
        }],
      });
      enhancedPrompt = transRes.text || config.prompt;
    } catch (e) {}

    const contentsParts: any[] = [];
    if (config.baseImage) {
      // ทำความสะอาด base64 string
      const base64Data = config.baseImage.includes(',') ? config.baseImage.split(',')[1] : config.baseImage;
      contentsParts.push({ inlineData: { data: base64Data, mimeType: 'image/png' } });
    }

    contentsParts.push({ 
      text: `Professional product photography, ${enhancedPrompt}, ${config.style}, studio background, commercial lighting, 8k resolution, cinematic look, depth of field.` 
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: contentsParts }],
      config: { 
        imageConfig: { 
          aspectRatio: config.aspectRatio as any 
        } 
      }
    });

    // ค้นหาภาพในผลลัพธ์
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (part?.inlineData?.data) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
    throw new Error("API_RETURNED_NO_IMAGE");
  } catch (error: any) {
    if (error.message === "MISSING_KEY") throw error;
    if (error?.message?.includes("Requested entity was not found")) throw new Error("KEY_INVALID");
    throw error;
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  const win = window as any;
  // ตรวจสอบทั้งจาก window.aistudio และ process.env
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
    } catch (e) {
      console.error("Open key dialog error:", e);
    }
  }
  return false;
};
