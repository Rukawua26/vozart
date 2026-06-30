import Anthropic from "@anthropic-ai/sdk";
import { AIProvider, AIProviderConfig, AIAction, SYSTEM_PROMPT, sanitizeInput, parseAIResponse } from "./types.js";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly displayName = "Anthropic";
  readonly models = ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"];

  async processCommand(text: string, config?: AIProviderConfig): Promise<AIAction[]> {
    const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || "";
    if (!apiKey) {
      return [{ action: "ERROR", message: "ANTHROPIC_API_KEY no configurada" }];
    }

    const client = new Anthropic({ apiKey });

    const model = config?.model || "claude-sonnet-4-20250514";
    const cleaned = sanitizeInput(text);
    const effectivePrompt = (config?.context ? `${SYSTEM_PROMPT}\n\nContexto del usuario:\n${config.context}\n\n` : SYSTEM_PROMPT);

    const msg = await client.messages.create({
      model,
      max_tokens: 1024,
      system: effectivePrompt,
      messages: [{ role: "user", content: cleaned }],
    });

    const content = msg.content[0];
    if (!content || content.type !== "text") {
      return [{ action: "ERROR", message: "Anthropic no devolvió respuesta de texto" }];
    }

    return parseAIResponse(content.text, "Anthropic");
  }
}
