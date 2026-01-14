
import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";

/**
 * Tests the connection to the Gemini API
 */
export const testConnection = async (): Promise<{valid: boolean, error?: string}> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
 * Generates a poster image using a Hybrid approach:
 * 1. Gemini (Free Tier) generates a professional English visual prompt.
 * 2. A Free Community Engine (Pollinations/Flux) renders the pixels.
 */
export const generatePosterImage = async (config: GenerationConfig): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Step 1: Use Gemini to "Imagine" a professional prompt in English
  const systemInstruction = `You are a professional advertising art director. 
  Convert the user's product description into a highly detailed, cinematic, high-end commercial photography prompt.
  Focus on: Studio lighting (Rembrandt, softbox), texture (4k, 8k), composition (Rule of thirds, macro), and atmosphere.
  DO NOT include any text, letters, or numbers in the visual description.
  Output ONLY the English prompt string.`;

  const userRequest = `Product: ${config.prompt}. Style: ${config.style}. Aspect Ratio: ${config.aspectRatio}. ${config.posterText ? `Context: ${config.posterText}` : ''}`;

  try {
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userRequest,
      config: { 
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 200
      }
    });

    const visualPrompt = geminiResponse.text?.trim() || `Professional product photography of ${config.prompt}, high-end ${config.style} style, studio lighting`;
    
    // Step 2: Use Free Community Engine to generate the actual image
    // We use Pollinations AI because it's fast, free, and supports high-quality prompts from Gemini
    const seed = Math.floor(Math.random() * 1000000);
    const [widthRatio, heightRatio] = config.aspectRatio.split(':').map(Number);
    
    // Standardizing dimensions for better quality (Approx 1024-1280px)
    const baseSize = 1024;
    const w = widthRatio >= heightRatio ? baseSize : Math.floor(baseSize * (widthRatio / heightRatio));
    const h = heightRatio >= widthRatio ? baseSize : Math.floor(baseSize * (heightRatio / widthRatio));

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux&enhance=true`;

    // Step 3: Fetch the image and convert to Base64 to keep the Canvas logic working
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
    console.error("Generation Error:", error);
    throw new Error("OTHER_ERROR");
  }
};
