import { AIProvider, AIProviderConfig, AIAction, SYSTEM_PROMPT, sanitizeInput, parseAIResponse } from "./types.js";

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  readonly displayName = "Ollama (local)";
  readonly models = ["llama3", "llama3.2", "mistral", "mixtral", "qwen2.5", "deepseek-coder"];

  async processCommand(text: string, config?: AIProviderConfig): Promise<AIAction[]> {
    const baseUrl = (config?.baseUrl || process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
    const model = config?.model || "llama3.2";
    const cleaned = sanitizeInput(text);

    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: (config?.context ? `${SYSTEM_PROMPT}\n\nContexto del usuario:\n${config.context}\n\n` : SYSTEM_PROMPT) },
            { role: "user", content: cleaned },
          ],
          stream: false,
          format: "json",
        }),
      });

      if (!res.ok) {
        return [{ action: "ERROR", message: `Ollama error: ${res.status} ${res.statusText}` }];
      }

      const data = await res.json();
      const content = data.message?.content;

      if (!content) {
        return [{ action: "ERROR", message: "Ollama no devolvió respuesta" }];
      }

      return parseAIResponse(content, "Ollama");
    } catch (err: any) {
      return [{ action: "ERROR", message: `No se pudo conectar a Ollama: ${err.message}` }];
    }
  }
}
