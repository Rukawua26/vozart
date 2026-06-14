import { AIProvider, AIProviderConfig } from "./types.js";
import { GeminiProvider } from "./gemini.js";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { OllamaProvider } from "./ollama.js";

const providers: Map<string, AIProvider> = new Map();

export function registerProvider(provider: AIProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: string): AIProvider | undefined {
  return providers.get(name);
}

export function listProviders(): AIProvider[] {
  return Array.from(providers.values());
}

registerProvider(new GeminiProvider());
registerProvider(new OpenAIProvider());
registerProvider(new AnthropicProvider());
registerProvider(new OllamaProvider());
