
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

export const generatePosterSlogan = async (productInfo: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate 5 catchy, short, and striking marketing slogans in Thai for this product: "${productInfo}". 
    The slogans should be suitable for a commercial poster. Focus on the product's identity and premium feel. 
    Keep them under 10 words each.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("ระบบตรวจไม่พบ API Key กรุณาตั้งค่า API_KEY ในหน้า Settings ของ Vercel ก่อนใช้งาน");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // ใช้โมเดล gemini-2.5-flash-image เพื่อให้ใช้งานได้เลยไม่ต้องถามหา Key จากฝั่ง User
  const modelName = 'gemini-2.5-flash-image';
  
  let parts: any[] = [];
  
  if (config.baseImage) {
    const base64Data = config.baseImage.split(',')[1];
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
  }

  let instruction = `You are a world-class advertising creative director.
  TASK: Design a high-impact, professional marketing poster.
  
  STYLE: ${config.style}
  ENVIRONMENT: ${config.prompt}
  
  STRIKING TYPOGRAPHY RULES:
  1. The text "${config.posterText || ''}" is the main slogan. Render it with BOLD, PREMIUM 3D typography.
  2. The text should be integrated into the scene's lighting and atmosphere.
  3. Ensure high contrast so the message is clear.
  
  VISUAL QUALITY:
  - Professional studio lighting, 8K resolution, cinematic atmosphere.
  - Luxury commercial grade photography look.`;

  if (config.baseImage) {
    instruction += `
    PRODUCT INTEGRATION: 
    ${config.removeBackground ? 'Precisely extract the product and place it in this new studio setup.' : 'Blend the product naturally into the background.'}`;
  }

  parts.push({ text: instruction });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any
        }
      }
    });

    let imageUrl = '';
    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("AI ไม่สามารถสร้างรูปภาพได้ในขณะนี้ กรุณาลองใหม่");
    return imageUrl;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes("429")) throw new Error("โควตาการใช้งานหนาแน่น กรุณารอสักครู่แล้วลองใหม่ครับ");
    throw error;
  }
};

export const openKeySelector = async () => {
  // @ts-ignore
  if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    return true;
  }
  return false;
};
