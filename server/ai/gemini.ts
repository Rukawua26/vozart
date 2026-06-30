import { GoogleGenAI } from "@google/genai";
import { AIProvider, AIProviderConfig, AIAction, SYSTEM_PROMPT, sanitizeInput, parseAIResponse } from "./types.js";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly displayName = "Gemini";
  readonly models = ["gemini-2.0-flash", "gemini-2.5-flash-preview", "gemini-3-flash-preview"];

  async processCommand(text: string, config?: AIProviderConfig): Promise<AIAction[]> {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return [{ action: "ERROR", message: "GEMINI_API_KEY no configurada" }];
    }

    const genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'vozart' },
      },
    });

    const model = config?.model || "gemini-2.0-flash";
    const cleaned = sanitizeInput(text);
    const effectivePrompt = (config?.context ? `${SYSTEM_PROMPT}\n\nContexto del usuario:\n${config.context}\n\n` : SYSTEM_PROMPT);

    const result = await (genAI.models.generateContent as any)({
      model,
      systemInstruction: { parts: [{ text: effectivePrompt }] },
      contents: [{ parts: [{ text: `Comando del usuario: ${cleaned}` }] }],
      config: { responseMimeType: "application/json" },
    });

    const responseText = result.text;
    if (!responseText) {
      return [{ action: "ERROR", message: "Gemini no devolvió respuesta" }];
    }

    return parseAIResponse(responseText, "Gemini");
  }
}
