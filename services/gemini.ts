import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

export const generatePosterSlogan = async (productInfo: string): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  // บังคับเลือกโมเดลให้ชัดเจนที่สุด
  const modelName = config.highQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  // สร้าง instance ใหม่ทุกครั้งก่อนเรียกใช้ เพื่อป้องกัน Key สตาร์ทไม่ติด
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const parts: any[] = [];
  const stylePrompt = config.style || "Professional commercial photography";
  const finalPrompt = `Professional product poster for "${config.prompt}". 
    Target context: "${config.posterText || ''}". 
    Style: ${stylePrompt}. 
    High quality, studio lighting, 8k resolution, advertisement grade.
    ${config.removeBackground ? 'Isolated product on a clean artistic background.' : ''}`;

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
    
    throw new Error("AI ไม่ได้ส่งรูปภาพกลับมา กรุณาลองใหม่");
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const openKeySelector = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};