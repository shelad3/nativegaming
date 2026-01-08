
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Strict adherence to guidelines by using process.env.API_KEY directly in initialization
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const moderateContent = async (title: string, description: string): Promise<{ allowed: boolean; reason: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `You are the NativeCodeX Content Moderator. 
      The platform ONLY allows gaming-related content (walkthroughs, esports, speedruns, game reviews). 
      Strictly reject anything else (vlogs, politics, generic news, movies, etc).
      
      Analyze this content:
      Title: "${title}"
      Description: "${description}"
      
      Return JSON: { "allowed": boolean, "reason": "Short explanation" }`,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return { allowed: false, reason: "Moderation engine offline." };
  }
};

export const analyzeMonetization = async (query: string, currentStats: any) => {
  try {
    // Upgraded with Google Search grounding for real-time market data
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `
        You are the NativeCodeX Monetization Consultant. 
        Context: The platform uses tiered subscriptions, CodeBits currency, and a 70/30 creator revenue split.
        Current Stats: ${JSON.stringify(currentStats)}
        
        Analyze the following request using Google Search to compare with real-world gaming market trends:
        "${query}"
      `,
      config: {
        temperature: 0.7,
        maxOutputTokens: 800,
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, sources };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "SYSTEM ERROR: Failed to interface with AI consultant via Google Search nodes.", sources: [] };
  }
};

export const generateGamerArchetype = async (interests: string[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `User selected these gaming interests: ${interests.join(", ")}. 
      Generate a cool, cyberpunk/hacker-style "Gamer Archetype" name (2-3 words) and a 1-sentence tactical bio for their profile. 
      Return in JSON format with keys: "archetype" and "bio".`,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return { archetype: "Unknown Node", bio: "Signal lost. Archetype undefined." };
  }
};
