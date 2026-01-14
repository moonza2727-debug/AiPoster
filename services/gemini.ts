
import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";
import { STYLE_PRESETS } from "../constants";

export const testConnection = async (): Promise<{valid: boolean, error?: string}> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return { valid: false, error: "Missing Key" };
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'hi',
    });
    return { valid: !!response.text };
  } catch (e: any) {
    console.error("Connection Test Error:", e);
    return { valid: false, error: e.message };
  }
};

/**
 * Generates a background based on USER INPUT and SELECTED STYLE.
 */
export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  // ตรวจสอบว่ามี API Key หรือไม่
  if (!apiKey) {
    console.error("API Key is missing in process.env.API_KEY");
    throw new Error("API Key not found");
  }

  // สร้าง Instance ใหม่ทุกครั้งตามคู่มือเพื่อป้องกันปัญหา Key เก่า
  const ai = new GoogleGenAI({ apiKey });
  
  const selectedPreset = STYLE_PRESETS.find(s => s.label === config.style);
  const presetPrompt = selectedPreset ? selectedPreset.prompt : "";

  // ปรับ Prompt ให้สั้นและชัดเจนขึ้นเพื่อลดโอกาสเกิด Error
  const visualPrompt = `Premium professional product background for a commercial poster. 
THEME: ${presetPrompt}. 
SCENE DETAILS: ${config.prompt}. 
Visual Style: Professional photography, studio lighting, depth of field, high quality digital art. 
STRICTLY NO TEXT, NO PEOPLE, NO LOGOS, NO WATERMARKS. 
Clean floor for product placement. 
Aspect Ratio: ${config.aspectRatio}.`;

  try {
    const supportedRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    let aspect = config.aspectRatio as string;
    
    if (!supportedRatios.includes(aspect)) {
      if (aspect === "4:5") aspect = "3:4";
      else if (aspect === "2:3") aspect = "9:16";
      else if (aspect === "21:9") aspect = "16:9";
      else aspect = "1:1";
    }

    console.log("Generating with model gemini-2.5-flash-image and prompt:", visualPrompt);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: visualPrompt, // ใช้ string prompt โดยตรงเพื่อความเสถียร
      config: {
        imageConfig: {
          aspectRatio: aspect as any
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          console.log("Successfully received image from Gemini");
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    console.error("Response structure from Gemini was unexpected:", response);
    throw new Error("AI did not return an image part.");
  } catch (error: any) {
    console.error("Gemini Generation Error Detailed:", error);
    // หาก Error เป็นเรื่องของ Key ให้ระบุชัดเจนขึ้น
    if (error.message?.includes("entity was not found") || error.message?.includes("404")) {
      throw new Error("Model or API Key error (Requested entity not found)");
    }
    throw error;
  }
};
