import { describe, it, expect } from "vitest";
import { z } from "zod";

const VoiceCommandSchema = z.object({
  type: z.literal("VOICE_COMMAND"),
  text: z.string().min(1).max(2000),
  provider: z.string().min(1).max(50),
  context: z.string().max(2000).optional(),
  sessionId: z.string().max(80).optional(),
});

describe("VoiceCommandSchema", () => {
  it("acepta comando minimo valido", () => {
    const result = VoiceCommandSchema.safeParse({
      type: "VOICE_COMMAND",
      text: "dibuja un circulo",
      provider: "gemini",
    });
    expect(result.success).toBe(true);
  });

  it("acepta comando con todos los campos", () => {
    const result = VoiceCommandSchema.safeParse({
      type: "VOICE_COMMAND",
      text: "fondo azul oscuro",
      provider: "openai",
      context: "[Perfil: Artista] colores: #3B82F6 | formas: circle",
      sessionId: "session-abc-123",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza texto vacio", () => {
    const result = VoiceCommandSchema.safeParse({
      type: "VOICE_COMMAND",
      text: "",
      provider: "gemini",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza texto mayor a 2000 chars", () => {
    const result = VoiceCommandSchema.safeParse({
      type: "VOICE_COMMAND",
      text: "x".repeat(2001),
      provider: "gemini",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza tipo incorrecto", () => {
    const result = VoiceCommandSchema.safeParse({
      type: "OTHER",
      text: "hola",
      provider: "gemini",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza provider vacio", () => {
    const result = VoiceCommandSchema.safeParse({
      type: "VOICE_COMMAND",
      text: "hola",
      provider: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza context mayor a 2000 chars", () => {
    const result = VoiceCommandSchema.safeParse({
      type: "VOICE_COMMAND",
      text: "hola",
      provider: "gemini",
      context: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rechaza sessionId mayor a 80 chars", () => {
    const result = VoiceCommandSchema.safeParse({
      type: "VOICE_COMMAND",
      text: "hola",
      provider: "gemini",
      sessionId: "x".repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it("acepta campos extra", () => {
    const result = VoiceCommandSchema.safeParse({
      type: "VOICE_COMMAND",
      text: "hola",
      provider: "gemini",
      extraField: "ignorado",
    });
    expect(result.success).toBe(true);
  });
});
