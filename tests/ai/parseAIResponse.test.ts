import { describe, it, expect } from "vitest";
import { parseAIResponse, sanitizeInput } from "../../server/ai/types.js";

describe("sanitizeInput", () => {
  it("trunca a 1000 caracteres", () => {
    const long = "a".repeat(2000);
    expect(sanitizeInput(long).length).toBe(1000);
  });

  it("elimina caracteres de control", () => {
    const result = sanitizeInput('hello\x00world\x08test\x1adone');
    expect(result).toBe("helloworldtestdone");
  });

  it("elimina caracteres que pueden romper JSON o prompt", () => {
    const result = sanitizeInput('dibuja "sol"\\nueva\nlinea\r');
    expect(result).toBe("dibuja solnuevalinea");
  });

  it("convierte null/undefined a string vacío", () => {
    expect(sanitizeInput(null)).toBe("");
    expect(sanitizeInput(undefined)).toBe("");
  });

  it("convierte números a string", () => {
    expect(sanitizeInput(123)).toBe("123");
  });
});

describe("parseAIResponse", () => {
  it("parsea ADD_SHAPE válido", () => {
    const input = JSON.stringify({ action: "ADD_SHAPE", shape: "rect", color: "#FF5733", size: 120 });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ADD_SHAPE");
    if (result.action !== "ADD_SHAPE") throw new Error("Expected ADD_SHAPE");
    expect(result.shape).toBe("rect");
    expect(result.color).toBe("#FF5733");
    expect(result.size).toBe(120);
  });

  it("parsea CHANGE_BG válido", () => {
    const input = JSON.stringify({ action: "CHANGE_BG", color: "#0F172A" });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("CHANGE_BG");
    if (result.action !== "CHANGE_BG") throw new Error("Expected CHANGE_BG");
    expect(result.color).toBe("#0F172A");
  });

  it("parsea CLEAR_CANVAS", () => {
    const result = parseAIResponse(JSON.stringify({ action: "CLEAR_CANVAS" }), "Test");
    expect(result.action).toBe("CLEAR_CANVAS");
  });

  it("parsea GENERATE_IMAGE válido", () => {
    const input = JSON.stringify({ action: "GENERATE_IMAGE", prompt: "un paisaje" });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("GENERATE_IMAGE");
    if (result.action !== "GENERATE_IMAGE") throw new Error("Expected GENERATE_IMAGE");
    expect(result.prompt).toBe("un paisaje");
  });

  it("parsea ERROR válido", () => {
    const input = JSON.stringify({ action: "ERROR", message: "No entendí el comando" });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ERROR");
    if (result.action !== "ERROR") throw new Error("Expected ERROR");
    expect(result.message).toBe("No entendí el comando");
  });

  it("parsea JSON válido con espacios alrededor", () => {
    const input = `  ${JSON.stringify({ action: "CLEAR_CANVAS" })}\n`;
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("CLEAR_CANVAS");
  });

  it("rechaza action inválido", () => {
    const input = JSON.stringify({ action: "DELETE_EVERYTHING" });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza ADD_SHAPE incompleto", () => {
    const input = JSON.stringify({ action: "ADD_SHAPE" });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza CHANGE_BG sin color", () => {
    const input = JSON.stringify({ action: "CHANGE_BG" });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza ERROR sin mensaje", () => {
    const input = JSON.stringify({ action: "ERROR" });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza color hex inválido", () => {
    const input = JSON.stringify({ action: "CHANGE_BG", color: "red" });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza JSON inválido", () => {
    const result = parseAIResponse("esto no es json", "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza size negativo", () => {
    const input = JSON.stringify({ action: "ADD_SHAPE", shape: "circle", color: "#3B82F6", size: -10 });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza size excesivo", () => {
    const input = JSON.stringify({ action: "ADD_SHAPE", shape: "circle", color: "#3B82F6", size: 4096 });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza shape no soportado", () => {
    const input = JSON.stringify({ action: "ADD_SHAPE", shape: "star", color: "#3B82F6", size: 100 });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza prompt vacío para GENERATE_IMAGE", () => {
    const input = JSON.stringify({ action: "GENERATE_IMAGE", prompt: "" });
    const result = parseAIResponse(input, "Test");
    expect(result.action).toBe("ERROR");
  });

  it("incluye el nombre del provider en mensaje de error", () => {
    const result = parseAIResponse("basura", "Gemini");
    if (result.action !== "ERROR") throw new Error("Expected ERROR");
    expect(result.message).toContain("Gemini");
  });
});
