import { GoogleGenAI } from "@google/genai";
import { AIProvider, AIProviderConfig, AIAction, SYSTEM_PROMPT } from "./types.js";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly displayName = "Gemini";
  readonly models = ["gemini-2.0-flash", "gemini-2.5-flash-preview", "gemini-3-flash-preview"];

  async processCommand(text: string, config?: AIProviderConfig): Promise<AIAction> {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return { action: "ERROR", message: "GEMINI_API_KEY no configurada" };
    }

    const genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'vozart' },
      },
    });

    const model = config?.model || "gemini-2.0-flash";

    const result = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nComando: "${text}"` }] }],
      config: { responseMimeType: "application/json" },
    });

    const responseText = result.text;
    if (!responseText) {
      return { action: "ERROR", message: "Gemini no devolvió respuesta" };
    }

    try {
      return JSON.parse(responseText.trim());
    } catch {
      return { action: "ERROR", message: "Gemini generó una respuesta inválida" };
    }
  }
}
