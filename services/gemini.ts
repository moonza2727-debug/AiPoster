
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
    
    // ใช้ getter .text ตามคำแนะนำของ SDK
    const responseText = response.text;
    if (!responseText) return [];
    
    return JSON.parse(responseText.trim());
  } catch (e: any) {
    console.error("Slogan Error:", e);
    if (e?.message?.includes("429")) throw new Error("QUOTA_EXCEEDED");
    throw e;
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = getAI();
  
  // 1. แปลและปรับปรุง Prompt
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
  const contentsParts: any[] = [];
  
  if (config.baseImage) {
    const base64Data = config.baseImage.includes(',') 
      ? config.baseImage.split(',')[1] 
      : config.baseImage;
      
    contentsParts.push({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
  }

  const bgPrompt = config.removeBackground 
    ? "Isolate the product and place it in a brand new, luxurious studio background." 
    : "Enhance the overall aesthetic while keeping the original context.";

  const fullPrompt = `Create a high-end commercial poster image.
  STYLE: ${config.style}
  PRODUCT DESCRIPTION: ${enhancedPrompt}
  BACKGROUND ACTION: ${bgPrompt}
  QUALITY: High definition, realistic textures, cinematic lighting.
  Note: Ensure the product remains the central focus of the image.`;

  contentsParts.push({ text: fullPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: contentsParts }],
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any
        }
      }
    });

    // การตรวจสอบ Candidates แบบละเอียดสูงสุดเพื่อแก้ปัญหา TypeScript Error TS18048
    const responseCandidates = response.candidates;
    if (!responseCandidates || responseCandidates.length === 0) {
      throw new Error("API_RETURNED_NO_IMAGE");
    }

    const firstCandidate = responseCandidates[0];
    const candidateContent = firstCandidate.content;
    if (!candidateContent) {
      throw new Error("API_RETURNED_NO_IMAGE");
    }

    const candidateParts = candidateContent.parts;
    if (!candidateParts || candidateParts.length === 0) {
      throw new Error("API_RETURNED_NO_IMAGE");
    }

    // วนลูปหา Part ที่เป็นรูปภาพใน InlineData
    for (const part of candidateParts) {
      if (part.inlineData && part.inlineData.data) {
        const data = part.inlineData.data;
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${data}`;
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
  try {
    const win = window as any;
    if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (hasKey) return true;
    }
  } catch (e) {}
  return !!process.env.API_KEY;
};

export const openKeySelector = async () => {
  const win = window as any;
  if (win.aistudio && typeof win.aistudio.openSelectKey === 'function') {
    await win.aistudio.openSelectKey();
    return true;
  }
  return false;
};
