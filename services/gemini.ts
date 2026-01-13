
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
    throw new Error("ระบบตรวจไม่พบ API Key กรุณาตั้งค่า API_KEY ในระบบก่อนใช้งาน");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const modelName = config.highQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
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

  let instruction = `You are a world-class advertising creative director and master of typography.
  TASK: Design a high-impact, professional marketing poster.
  
  STYLE: ${config.style}
  ENVIRONMENT: ${config.prompt}
  
  STRIKING TYPOGRAPHY RULES:
  1. The text "${config.posterText || ''}" is the absolute HERO. It must "SHOUT" from the poster.
  2. Use a BOLD, OVERSIZED, 3D typography style with deep textures (Gold, Neon, or Crisp Modern).
  3. Ensure high-contrast colors (e.g., Bright White on Dark, Gold on Black) so it catches the eye instantly.
  4. The typography should be beautifully integrated into the lighting of the 3D studio scene.
  
  VISUAL QUALITY:
  - Professional studio lighting (8K resolution, cinematic atmosphere).
  - Luxury commercial grade photography look.
  - Precise focus on the product, making it look premium.`;

  if (config.baseImage) {
    instruction += `
    PRODUCT INTEGRATION: 
    ${config.removeBackground ? 'Precisely extract the product and place it as a 3D object in this new high-end studio setup.' : 'Blend the product naturally into the new high-quality background.'}`;
  }

  parts.push({ text: instruction });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any,
          ...(config.highQuality ? { imageSize: "1K" } : {})
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

    if (!imageUrl) throw new Error("AI ไม่สามารถสร้างรูปภาพได้ กรุณาลองปรับข้อความพาดหัวแล้วกดใหม่ครับ");
    return imageUrl;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes("429")) throw new Error("โควตาฟรีชั่วคราวของคุณหมดแล้ว กรุณารอสักครู่แล้วลองใหม่ครับ");
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
