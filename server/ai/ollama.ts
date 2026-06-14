import { AIProvider, AIProviderConfig, AIAction, SYSTEM_PROMPT } from "./types.js";

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  readonly displayName = "Ollama (local)";
  readonly models = ["llama3", "llama3.2", "mistral", "mixtral", "qwen2.5", "deepseek-coder"];

  async processCommand(text: string, config?: AIProviderConfig): Promise<AIAction> {
    const baseUrl = (config?.baseUrl || process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
    const model = config?.model || "llama3.2";

    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: `${SYSTEM_PROMPT}\n\nResponde SOLO con JSON válido, sin markdown.` },
            { role: "user", content: text },
          ],
          stream: false,
          format: "json",
        }),
      });

      if (!res.ok) {
        return { action: "ERROR", message: `Ollama error: ${res.status} ${res.statusText}` };
      }

      const data = await res.json();
      const content = data.message?.content;

      if (!content) {
        return { action: "ERROR", message: "Ollama no devolvió respuesta" };
      }

      try {
        return JSON.parse(content.trim());
      } catch {
        return { action: "ERROR", message: "Ollama generó una respuesta inválida" };
      }
    } catch (err: any) {
      return { action: "ERROR", message: `No se pudo conectar a Ollama: ${err.message}` };
    }
  }
}
