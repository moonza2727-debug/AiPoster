
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// ฟังก์ชันสร้าง AI Instance โดยดึง Key จาก Environment
const getAI = () => {
  const apiKey = process.env.API_KEY;
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
          text: `คุณคือผู้เชี่ยวชาญด้านการตลาด ช่วยคิดคำโปรโมทสินค้าสั้นๆ 5 แบบ สำหรับ: "${productInfo}" ให้น่าสนใจและสะดุดตา ตอบกลับเป็น JSON Array ของ String เท่านั้น (ภาษาไทย)`
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
    return ["สินค้าคุณภาพดี", "โปรโมชั่นพิเศษวันนี้", "หอม อร่อย ต้องลอง", "ของดีเมืองน่าน", "ราคาคุ้มค่า"];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = getAI();
  
  // แปลและปรับจูน Prompt ให้สวยขึ้น (โหมดฟรี)
  let finalPrompt = config.prompt;
  try {
    const trans = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `Convert to professional English image generation prompt: "${config.prompt}". Style: ${config.style}. High quality, studio lighting.` }] }]
    });
    finalPrompt = trans.text || config.prompt;
  } catch (e) {}

  const parts: any[] = [];
  if (config.baseImage) {
    const base64Data = config.baseImage.split(',')[1] || config.baseImage;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
  }
  
  parts.push({ 
    text: `Professional product poster, ${finalPrompt}, background style ${config.style}, cinematic lighting, masterpiece, 8k.` 
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts }, // ใช้โครงสร้าง contents: { parts } ตามคำแนะนำ SDK
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any
        }
      }
    });

    // ตรวจสอบข้อมูลภาพใน Response
    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imagePart?.inlineData?.data) {
      return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
    throw new Error("AI ไม่คืนค่ารูปภาพกลับมา");
  } catch (error: any) {
    if (error?.message?.includes("429")) throw new Error("โควตาฟรีหมดชั่วคราว (รอ 1 นาที)");
    throw error;
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  const key = process.env.API_KEY;
  return !!(key && key !== "undefined" && key.length > 5);
};

export const openKeySelector = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};
