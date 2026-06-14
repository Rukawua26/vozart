export interface AIAction {
  action: "ADD_SHAPE" | "CHANGE_BG" | "CLEAR_CANVAS" | "GENERATE_IMAGE" | "ERROR";
  shape?: "rect" | "circle" | "triangle";
  color?: string;
  size?: number;
  prompt?: string;
  message?: string;
}

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly displayName: string;
  readonly models: string[];
  processCommand(text: string, config?: AIProviderConfig): Promise<AIAction>;
}

export const SYSTEM_PROMPT = `Eres un asistente experto en Fabric.js.
Interpreta el comando del usuario y devuelve un objeto JSON que describa acciones para un lienzo (canvas).

Esquema de respuesta obligatorio:
- { "action": "ADD_SHAPE", "shape": "rect" | "circle" | "triangle", "color": string, "size": number }
- { "action": "CHANGE_BG", "color": string }
- { "action": "CLEAR_CANVAS" }
- { "action": "GENERATE_IMAGE", "prompt": string }

Reglas:
1. Responde SOLO el JSON, sin markdown ni texto adicional.
2. Si no entiendes, devuelve {"action": "ERROR", "message": "No entendí el comando"}.
3. Usa colores en formato hexadecimal.
4. Si piden dibujar algo complejo, usa GENERATE_IMAGE con un buen prompt detallado.`;
