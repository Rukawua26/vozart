import OpenAI from "openai";
import { AIProvider, AIProviderConfig, AIAction, SYSTEM_PROMPT } from "./types.js";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly displayName = "OpenAI";
  readonly models = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];

  async processCommand(text: string, config?: AIProviderConfig): Promise<AIAction> {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return { action: "ERROR", message: "OPENAI_API_KEY no configurada" };
    }

    const client = new OpenAI({
      apiKey,
      baseURL: config?.baseUrl || undefined,
    });

    const model = config?.model || "gpt-4o-mini";

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { action: "ERROR", message: "OpenAI no devolvió respuesta" };
    }

    try {
      return JSON.parse(content.trim());
    } catch {
      return { action: "ERROR", message: "OpenAI generó una respuesta inválida" };
    }
  }
}
