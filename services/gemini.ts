
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

/**
 * ดึง API KEY ล่าสุดจาก Environment
 */
const getAIClient = () => {
  const apiKey = process.env.API_KEY || "";
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
    return ["สินค้าคุณภาพดี", "โปรโมชั่นพิเศษ", "ของพรีเมียม", "ดีลสุดคุ้ม"];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const modelName = config.highQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  // สร้างอินสแตนซ์ใหม่ทุกครั้งเพื่อให้แน่ใจว่าใช้ Key ล่าสุดจากระบบ
  const ai = getAIClient();
  
  const parts: any[] = [];
  const stylePrompt = config.style || "Commercial photography";
  const finalPrompt = `Professional product poster: "${config.prompt}". 
    Headline: "${config.posterText || ''}". 
    Style: ${stylePrompt}. 
    Clean background, studio lighting.`;

  if (config.baseImage) {
    const base64Data = config.baseImage.includes(',') ? config.baseImage.split(',')[1] : config.baseImage;
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

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("AI ไม่สามารถสร้างภาพได้ในขณะนี้ กรุณาลองใหม่หรือตรวจสอบการตั้งค่า");
  } catch (error: any) {
    console.error("Gemini API Error Response:", error);
    
    // ส่ง Error Message กลับไปให้ App จัดการต่อ
    const errorMessage = error.message || error.toString() || "";
    throw new Error(errorMessage);
  }
};

export const openKeySelector = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};
