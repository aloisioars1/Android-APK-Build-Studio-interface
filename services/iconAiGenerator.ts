import { GoogleGenAI } from "@google/genai";
import { generateIcon } from "../utils/iconGenerator";

export async function generateIconWithAi(brandingPrompt: string): Promise<string> {
  return generateAutomaticIconBase64("App", undefined, brandingPrompt);
}

/**
 * Gera automaticamente o arquivo ic_launcher.png (Base64) utilizando um prompt de IA
 * construído a partir do Nome e Descrição do aplicativo.
 */
export async function generateAutomaticIconBase64(
  appName: string,
  appDescription?: string,
  userPrompt?: string,
  customApiKey?: string
): Promise<string> {
  const apiKey = customApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;

  // Constrói o prompt detalhado para o ícone de aplicativo Android
  const baseDescription = appDescription && appDescription.trim().length > 0
    ? appDescription
    : 'Aplicativo móvel interativo e moderno';

  const fullPrompt = userPrompt && userPrompt.trim().length > 0
    ? userPrompt
    : `App launcher icon (ic_launcher.png) for Android mobile app named "${appName}". App purpose: ${baseDescription}. High quality vector or 3D render app icon, centered composition, vibrant colors, clean aesthetic, 1:1 square, no text inside icon, professional app store standard icon design.`;

  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: fullPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
      }
    } catch (err: any) {
      console.warn("Erro no gemini-3.1-flash-lite-image, tentando modelo fallback...", err);
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [{ text: fullPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              return part.inlineData.data;
            }
          }
        }
      } catch (err2: any) {
        console.warn("Modelos de imagem Gemini indisponíveis ou sem retorno. Utilizando gerador visual nativo de fallback...", err2);
      }
    }
  }

  // Fallback caso a API falhe ou não haja chave: gera um ícone base64 de alta resolução em Canvas
  return await generateIcon(appName || 'App', '#2563EB', '#FFFFFF', 512, false);
}

