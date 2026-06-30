import { z } from "zod";

const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const SingleActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ADD_SHAPE"),
    shape: z.enum(["rect", "circle", "triangle", "curve", "polygon"]),
    color: HexColorSchema.optional(),
    size: z.number().positive().max(2048).optional(),
    left: z.number().optional(),
    top: z.number().optional(),
    opacity: z.number().min(0).max(1).optional(),
  }),
  z.object({
    action: z.literal("CHANGE_BG"),
    color: HexColorSchema,
  }),
  z.object({
    action: z.literal("CLEAR_CANVAS"),
  }),
  z.object({
    action: z.literal("GENERATE_IMAGE"),
    prompt: z.string().min(1).max(2000),
  }),
  z.object({
    action: z.literal("ERROR"),
    message: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("ADD_TEXT"),
    text: z.string().min(1).max(500),
    color: HexColorSchema.optional(),
    size: z.number().positive().max(200).optional(),
    left: z.number().optional(),
    top: z.number().optional(),
  }),
  z.object({
    action: z.literal("MODIFY_OBJECT"),
    target: z.enum(["last", "selected", "all"]).optional(),
    color: HexColorSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
    scaleX: z.number().positive().optional(),
    scaleY: z.number().positive().optional(),
  }),
  z.object({
    action: z.literal("DELETE_OBJECT"),
    target: z.enum(["last", "selected", "all"]).optional(),
  }),
  z.object({
    action: z.literal("SET_OPACITY"),
    value: z.number().min(0).max(1),
    target: z.enum(["last", "selected", "all"]).optional(),
  }),
  z.object({
    action: z.literal("MOVE_OBJECT"),
    left: z.number(),
    top: z.number(),
    target: z.enum(["last", "selected"]).optional(),
  }),
  z.object({
    action: z.literal("HARMONIZE_STROKE"),
    target: z.enum(["last", "selected", "all"]).optional(),
    color: HexColorSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
    scaleX: z.number().positive().optional(),
    scaleY: z.number().positive().optional(),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal("STORY_SCENE"),
    sceneDescription: z.string().optional(),
    actions: z.array(z.any()).min(1).max(20).optional(),
    transition: z.enum(["fade", "dissolve", "slide"]).optional(),
    duration: z.number().positive().max(30000).optional(),
  }),
]);

const AIResponseSchema = z.union([
  SingleActionSchema,
  z.object({
    actions: z.array(SingleActionSchema).min(1).max(15),
  }),
]);

export type AIAction = z.infer<typeof SingleActionSchema>;

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  context?: string;
  sessionId?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly displayName: string;
  readonly models: string[];
  processCommand(text: string, config?: AIProviderConfig): Promise<AIAction[]>;
}

export const SYSTEM_PROMPT = `Eres un asistente experto en Fabric.js para la app VozArt.
Interpreta el comando del usuario y devuelve acciones JSON para un lienzo (canvas).

PUEDES devolver UNA accion:
{"action":"ADD_SHAPE","shape":"rect|circle|triangle|curve|polygon","color":"#HEX","size":num,"left":num,"top":num,"opacity":0-1}
{"action":"ADD_TEXT","text":"...","color":"#HEX","size":num,"left":num,"top":num}
{"action":"CHANGE_BG","color":"#HEX"}
{"action":"CLEAR_CANVAS"}
{"action":"GENERATE_IMAGE","prompt":"..."}
{"action":"MODIFY_OBJECT","target":"last|selected|all","color":"#HEX","opacity":0-1,"scaleX":num,"scaleY":num}
{"action":"DELETE_OBJECT","target":"last|selected|all"}
{"action":"SET_OPACITY","value":0-1,"target":"last|selected|all"}
{"action":"MOVE_OBJECT","left":num,"top":num,"target":"last|selected"}
{"action":"HARMONIZE_STROKE","target":"last|selected","color":"#HEX","opacity":0-1,"reason":"..."} - Armoniza un trazo recien dibujado para que encaje con el resto del canvas.

Para MODO HISTORIA: cuando el usuario narre una historia, devuelve VARIAS STORY_SCENE en secuencia:
{"action":"STORY_SCENE","sceneDescription":"...","transition":"fade|dissolve|slide","duration":5000}
Cada escena puede incluir acciones internas que crean objetos, cambian fondos, etc.
Interpreta la narracion como escenas visuales secuenciales.

O VARIAS acciones en SECUENCIA:
{"actions":[{...accion1},{...accion2},...]}

Reglas:
1. Responde SOLO el JSON, sin markdown.
2. Si no entiendes, devuelve {"action":"ERROR","message":"No entendi el comando"}.
3. Colores en HEX (ej: #FF5733).
4. Para dibujo complejo usa GENERATE_IMAGE con buen prompt.
5. Entiende posicion: "izquierda","centro","derecha","arriba","abajo" mapea a left/top.
6. Entiende estilos: "realista","impresionista","acuarela","oleo","carboncillo","dibujo","vaporwave","minimalista" incluyelos en el prompt de GENERATE_IMAGE.
7. El contexto puede incluir "[Perfil: X]" con el perfil activo del usuario (Artista, Arquitectura, Medico, Legal, Educacion, Diagramas). Adapta las acciones al perfil.
8. En MODO HISTORIA, cuando el usuario dice "empieza la historia" o narra algo, interpretalo como una serie de escenas.`;


const MAX_INPUT_LENGTH = 1000;

export function sanitizeInput(text: unknown): string {
  const raw = String(text ?? "");
  return raw.replace(/[\0\x08\x09\x1a\n\r"'\\]/g, "").slice(0, MAX_INPUT_LENGTH);
}

export function parseAIResponse(text: string, provider: string): AIAction[] {
  try {
    const parsed = JSON.parse(text.trim());
    const result = AIResponseSchema.safeParse(parsed);
    if (result.success) {
      if ("actions" in result.data) {
        return result.data.actions;
      }
      return [result.data];
    }
    return [{ action: "ERROR", message: `${provider} genero una respuesta invalida: formato incorrecto` }];
  } catch {
    return [{ action: "ERROR", message: `${provider} genero una respuesta invalida: no es JSON` }];
  }
}
