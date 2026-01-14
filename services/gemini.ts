
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
    return { valid: false, error: e.message };
  }
};

/**
 * Generates a background based on USER INPUT and SELECTED STYLE.
 */
export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  // Find the actual preset prompt from constants
  const selectedPreset = STYLE_PRESETS.find(s => s.label === config.style);
  const presetPrompt = selectedPreset ? selectedPreset.prompt : "";

  // Combine user details with the professional preset
  const visualPrompt = `Professional premium product background. 
STYLE THEME: ${presetPrompt}. 
USER SPECIFIC DETAILS: ${config.prompt}. 
Visual Direction: High-end digital graphic art, Lanna contemporary aesthetic, rich textures, soft professional lighting, golden accents, atmospheric depth. 
STRICTLY NO TEXT, NO LOGOS, NO PEOPLE IN BACKGROUND. 
The background should be perfectly framed for a product to stand on a podium. 
Ratio: ${config.aspectRatio}.`;

  try {
    const supportedRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    let aspect = config.aspectRatio as string;
    
    // Fallback logic for unsupported ratios
    if (!supportedRatios.includes(aspect)) {
      if (aspect === "4:5") aspect = "3:4";
      else if (aspect === "2:3") aspect = "9:16";
      else if (aspect === "21:9") aspect = "16:9";
      else aspect = "1:1";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: visualPrompt }]
      },
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
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("AI did not return an image part.");
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
