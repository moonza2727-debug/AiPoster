
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// Helper สำหรับสร้าง Instance ของ AI โดยใช้ Key ล่าสุด
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("MISSING_KEY");
  return new GoogleGenAI({ apiKey });
};

export const generatePosterSlogan = async (productInfo: string): Promise<string[]> => {
  const ai = getAI();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: `Generate 5 catchy, short, and striking marketing slogans in Thai for this product: "${productInfo}". 
          The slogans should be suitable for a commercial poster. Focus on the product's identity and premium feel. 
          Keep them under 10 words each. Return as a JSON array of strings.`
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
    return JSON.parse(text || '[]');
  } catch (e: any) {
    console.error("Slogan Error:", e);
    if (e?.message?.includes("429")) throw new Error("QUOTA_EXCEEDED");
    throw e;
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = getAI();
  
  // 1. แปลและปรับปรุง Prompt ด้วยโมเดลข้อความก่อน
  let enhancedPrompt = config.prompt;
  try {
    const translationResult = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: `Translate and enhance this Thai product description into a professional English visual prompt for product photography: "${config.prompt}". Include keywords for 8k, studio lighting, and high-end feel. Return only the English text.`
        }]
      }],
    });
    enhancedPrompt = translationResult.text || config.prompt;
  } catch (e) {
    console.warn("Translation fallback used");
  }

  // 2. เตรียม Parts สำหรับโมเดลรูปภาพ
  const parts: any[] = [];
  
  // ใส่รูปสินค้าถ้ามี (ต้องเป็น Base64 ที่ไม่มี Prefix data:image/...)
  if (config.baseImage) {
    const base64Data = config.baseImage.includes(',') 
      ? config.baseImage.split(',')[1] 
      : config.baseImage;
      
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
  }

  // คำสั่งสำหรับลบพื้นหลังและจัดฉาก
  const bgPrompt = config.removeBackground 
    ? "Isolate the product and place it in a brand new, luxurious studio background." 
    : "Enhance the overall aesthetic while keeping the original context.";

  const fullPrompt = `Create a high-end commercial poster image.
  STYLE: ${config.style}
  PRODUCT DESCRIPTION: ${enhancedPrompt}
  BACKGROUND ACTION: ${bgPrompt}
  QUALITY: High definition, realistic textures, cinematic lighting.
  Note: Ensure the product remains the central focus of the image.`;

  parts.push({ text: fullPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts }],
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any
        }
      }
    });

    // ค้นหา Part ที่เป็นรูปภาพจาก Candidates
    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("NO_RESPONSE_FROM_AI");

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("API_RETURNED_NO_IMAGE");
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    const msg = error?.message || "";
    
    if (msg.includes("429")) throw new Error("QUOTA_EXCEEDED");
    if (msg.includes("API Key") || msg.includes("MISSING_KEY")) throw new Error("MISSING_KEY");
    if (msg.includes("safety")) throw new Error("SAFETY_BLOCK");
    
    throw error;
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  // ตรวจสอบทั้ง aistudio global และ process.env
  try {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (hasKey) return true;
    }
  } catch (e) {}
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
