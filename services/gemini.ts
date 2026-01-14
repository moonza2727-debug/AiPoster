
import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";

export const testConnection = async (): Promise<{valid: boolean, error?: string}> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "") return { valid: false, error: "Missing Key" };
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'hi',
      config: { maxOutputTokens: 2 }
    });
    return { valid: !!response.text };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
};

/**
 * Generates a professional BACKGROUND scene for the product.
 */
export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  // We want an EMPTY scene where the product can be placed
  let visualPrompt = `Professional studio background for a product, ${config.style} style, cinematic lighting, high-end photography backdrop, empty space in the center for product placement, 8k resolution, commercial advertising look, blurred depth of field`;
  
  const apiKey = process.env.API_KEY;
  
  if (apiKey && apiKey !== "") {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are a professional commercial photographer. 
      Generate a detailed description of an EMPTY STUDIO BACKGROUND or SCENE that would perfectly match the user's product.
      The scene should have a clear empty space in the center/foreground for a product to be placed.
      Focus on lighting, textures, and premium atmosphere.
      DO NOT describe or include the product itself in the scene.
      Output ONLY the English prompt string.`;

      const userRequest = `Product Type: ${config.prompt}. Style: ${config.style}.`;

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userRequest,
        config: { 
          systemInstruction,
          temperature: 0.8,
          maxOutputTokens: 200
        }
      });

      if (geminiResponse.text) {
        visualPrompt = geminiResponse.text.trim();
      }
    } catch (e) {
      console.warn("Gemini Error, using fallback background prompt", e);
    }
  }

  const seed = Math.floor(Math.random() * 1000000);
  const [widthRatio, heightRatio] = config.aspectRatio.split(':').map(Number);
  const baseSize = 1024;
  const w = widthRatio >= heightRatio ? baseSize : Math.floor(baseSize * (widthRatio / heightRatio));
  const h = heightRatio >= widthRatio ? baseSize : Math.floor(baseSize * (heightRatio / widthRatio));

  // Use Pollinations for the background rendering
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux&enhance=true`;

  try {
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error("IMAGE_ENGINE_ERROR");
    
    const blob = await imgResponse.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error("Background Generation Error:", error);
    throw new Error("OTHER_ERROR");
  }
};
