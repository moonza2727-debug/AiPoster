
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig } from "../types";

// ฟังก์ชันสร้าง AI instance ใหม่ทุกครั้งที่เรียกใช้ เพื่อให้ได้ Key ล่าสุดจากการกดเลือก
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    throw new Error("กรุณากดปุ่ม 'เชื่อมต่อระบบ' ที่มุมขวาบนก่อนนะครับ");
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
    return ["สินค้าพรีเมียม", "โปรโมชั่นพิเศษ", "ของดีจากน่าน", "คุณภาพเหนือราคา"];
  }
};

export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = getAI();
  
  // แปลและปรับปรุงคำสั่งภาษาไทยเป็นอังกฤษเพื่อให้ AI เข้าใจดีขึ้น
  let enhancedPrompt = config.prompt;
  try {
    const trans = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `Translate and enhance to a professional product photo prompt: "${config.prompt}". Style should be: ${config.style}.` }] }]
    });
    enhancedPrompt = trans.text || config.prompt;
  } catch (e) {}

  const parts: any[] = [];
  
  // แนบรูปสินค้าถ้ามีการอัปโหลด
  if (config.baseImage) {
    const base64Data = config.baseImage.includes(',') ? config.baseImage.split(',')[1] : config.baseImage;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
  }
  
  // คำสั่งลบพื้นหลัง (Image Inpainting Instruction)
  const bgInstruction = config.removeBackground 
    ? "ACTION: DETACH the product from its original background. PLACE the isolated product into a NEW premium environment." 
    : "Enhance the existing photo naturally.";

  parts.push({ 
    text: `${bgInstruction} High-end commercial product poster. Product: ${enhancedPrompt}. Background Style: ${config.style}. Soft studio lighting, 8k resolution, cinematic look, advertisement quality.` 
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any // '1:1', '3:4', '16:9' ฯลฯ
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI ไม่สามารถสร้างภาพได้ในขณะนี้");
  } catch (error: any) {
    if (error?.message?.includes("429")) throw new Error("โควตาฟรีชั่วคราวเต็มแล้ว (รอ 1 นาทีครับ)");
    throw error;
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio?.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  const key = process.env.API_KEY;
  return !!(key && key !== "undefined" && key.length > 10);
};

export const openKeySelector = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio?.openSelectKey) {
    await win.aistudio.openSelectKey();
    // หลังจากกดเลือกแล้ว ให้บังคับหน้าจออัปเดตสถานะ
    window.location.reload(); 
  }
};
