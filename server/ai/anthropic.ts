import Anthropic from "@anthropic-ai/sdk";
import { AIProvider, AIProviderConfig, AIAction, SYSTEM_PROMPT } from "./types.js";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly displayName = "Anthropic";
  readonly models = ["claude-sonnet-4-20250514", "claude-haiku-3-5-sonnet-20241022", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"];

  async processCommand(text: string, config?: AIProviderConfig): Promise<AIAction> {
    const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || "";
    if (!apiKey) {
      return { action: "ERROR", message: "ANTHROPIC_API_KEY no configurada" };
    }

    const client = new Anthropic({ apiKey });

    const model = config?.model || "claude-sonnet-4-20250514";

    const msg = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const content = msg.content[0];
    if (!content || content.type !== "text") {
      return { action: "ERROR", message: "Anthropic no devolvió respuesta de texto" };
    }

    try {
      return JSON.parse(content.text.trim());
    } catch {
      return { action: "ERROR", message: "Anthropic generó una respuesta inválida" };
    }
  }
}
