
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") {
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
          text: `คุณคือผู้เชี่ยวชาญด้านการตลาด ช่วยคิดคำโปรโมทสินค้าสั้นๆ 5 แบบ สำหรับสินค้า: "${productInfo}" ให้ดูพรีเมียมและน่าซื้อ ตอบกลับเป็น JSON Array ของ String เท่านั้น (ภาษาไทย)`
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
    return ["สินค้าคุณภาพดี", "โปรโมชั่นพิเศษ", "ของดีเมืองน่าน", "ราคาคุ้มค่า"];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = getAI();
  
  let enhancedPrompt = config.prompt;
  try {
    const trans = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `Create a professional product photography prompt: "${config.prompt}". Style: ${config.style}.` }] }]
    });
    enhancedPrompt = trans.text || config.prompt;
  } catch (e) {}

  const parts: any[] = [];
  
  if (config.baseImage) {
    const base64Data = config.baseImage.includes(',') ? config.baseImage.split(',')[1] : config.baseImage;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
  }
  
  // คำสั่งลบพื้นหลังแบบ AI (Inpainting/Replacement)
  const bgInstruction = config.removeBackground 
    ? "IMPORTANT: Completely remove the original background from the uploaded image and replace it with the new style. Isolate the product perfectly." 
    : "Integrate the product naturally into the scene.";

  parts.push({ 
    text: `${bgInstruction} Commercial product poster of ${enhancedPrompt}. Background style: ${config.style}. Professional studio lighting, 8k, cinematic masterpiece.` 
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any // '1:1', '3:4', '16:9' etc.
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI ไม่สามารถสร้างรูปภาพได้");
  } catch (error: any) {
    if (error?.message?.includes("429")) throw new Error("โควตาเต็ม (รอ 1 นาที)");
    throw error;
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  const key = process.env.API_KEY;
  return !!(key && key !== "undefined" && key.length > 5);
};

export const openKeySelector = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) await win.aistudio.openSelectKey();
};
