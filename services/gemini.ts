
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

export const generatePosterSlogan = async (productInfo: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
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
    return JSON.parse(response.text || '[]');
  } catch (e: any) {
    const msg = e?.message || "";
    if (msg.includes("429")) throw new Error("QUOTA_EXCEEDED");
    return [];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 1. แปลรายละเอียดสินค้าจากไทยเป็นอังกฤษเพื่อความแม่นยำของโมเดลรูปภาพ
  let translatedPrompt = config.prompt;
  try {
    const translationResult = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate and enhance this Thai product description into a highly descriptive English visual prompt for a professional studio product shot: "${config.prompt}". Focus on lighting, textures, and premium atmosphere. Return only the English prompt.`,
    });
    translatedPrompt = translationResult.text || config.prompt;
  } catch (e) {
    console.warn("Translation failed, using original prompt");
  }

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

  // ปรับปรุงคำสั่งเรื่องการลบพื้นหลังให้เข้มงวดขึ้น
  let bgInstruction = config.removeBackground 
    ? "MANDATORY: COMPLETELY REMOVE the original background of the provided product image. EXTRACT ONLY the product subject and place it realistically into the new generated environment. The new background must be entirely different as per the style."
    : "Keep the product and its immediate surroundings from the original image and blend them naturally into the new background style.";

  let instruction = `You are a world-class advertising creative director.
  TASK: Design a high-impact, professional marketing poster.
  STYLE DESCRIPTION: ${config.style}
  ENVIRONMENT & SUBJECT: ${translatedPrompt}
  BACKGROUND HANDLING: ${bgInstruction}
  TYPOGRAPHY: Integrate the text "${config.posterText || ''}" into the scene using 3D, premium font style that matches the lighting.`;

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
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("API_RETURNED_NO_IMAGE");
    return imageUrl;
  } catch (error: any) {
    const msg = error?.message || "";
    console.error("Gemini Error:", error);
    
    if (msg.includes("429")) throw new Error("QUOTA_EXCEEDED");
    if (msg.includes("Requested entity was not found")) throw new Error("INVALID_KEY");
    if (msg.includes("safety")) throw new Error("SAFETY_BLOCK");
    
    throw new Error(msg || "UNKNOWN_ERROR");
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  // @ts-ignore
  if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
    // @ts-ignore
    return await window.aistudio.hasSelectedApiKey();
  }
  return !!process.env.API_KEY;
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
