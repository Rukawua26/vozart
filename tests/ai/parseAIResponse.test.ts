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
  it("parsea ADD_SHAPE válido como array de 1", () => {
    const input = JSON.stringify({ action: "ADD_SHAPE", shape: "rect", color: "#FF5733", size: 120 });
    const [result] = parseAIResponse(input, "Test");
    expect(result.action).toBe("ADD_SHAPE");
    if (result.action !== "ADD_SHAPE") throw new Error("Expected ADD_SHAPE");
    expect(result.shape).toBe("rect");
    expect(result.color).toBe("#FF5733");
    expect(result.size).toBe(120);
  });

  it("parsea secuencia de acciones", () => {
    const input = JSON.stringify({
      actions: [
        { action: "ADD_SHAPE", shape: "circle", color: "#3B82F6", size: 100 },
        { action: "ADD_TEXT", text: "hola", color: "#111827", size: 24 },
        { action: "SET_OPACITY", value: 0.5, target: "last" },
      ],
    });
    const results = parseAIResponse(input, "Test");
    expect(results).toHaveLength(3);
    expect(results[0].action).toBe("ADD_SHAPE");
    expect(results[1].action).toBe("ADD_TEXT");
    expect(results[2].action).toBe("SET_OPACITY");
  });

  it("parsea CHANGE_BG válido", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "CHANGE_BG", color: "#0F172A" }), "Test");
    expect(result.action).toBe("CHANGE_BG");
    if (result.action !== "CHANGE_BG") throw new Error("Expected CHANGE_BG");
    expect(result.color).toBe("#0F172A");
  });

  it("parsea CLEAR_CANVAS", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "CLEAR_CANVAS" }), "Test");
    expect(result.action).toBe("CLEAR_CANVAS");
  });

  it("parsea GENERATE_IMAGE válido", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "GENERATE_IMAGE", prompt: "un paisaje" }), "Test");
    expect(result.action).toBe("GENERATE_IMAGE");
    if (result.action !== "GENERATE_IMAGE") throw new Error("Expected GENERATE_IMAGE");
    expect(result.prompt).toBe("un paisaje");
  });

  it("parsea ERROR válido", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "ERROR", message: "No entendí el comando" }), "Test");
    expect(result.action).toBe("ERROR");
    if (result.action !== "ERROR") throw new Error("Expected ERROR");
    expect(result.message).toBe("No entendí el comando");
  });

  it("parsea ADD_TEXT", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "ADD_TEXT", text: "Hola mundo", color: "#3B82F6", size: 32 }), "Test");
    expect(result.action).toBe("ADD_TEXT");
    if (result.action !== "ADD_TEXT") throw new Error("Expected ADD_TEXT");
    expect(result.text).toBe("Hola mundo");
    expect(result.color).toBe("#3B82F6");
    expect(result.size).toBe(32);
  });

  it("parsea MODIFY_OBJECT", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "MODIFY_OBJECT", target: "last", color: "#EF4444", opacity: 0.5 }), "Test");
    expect(result.action).toBe("MODIFY_OBJECT");
    if (result.action !== "MODIFY_OBJECT") throw new Error("Expected MODIFY_OBJECT");
    expect(result.target).toBe("last");
    expect(result.color).toBe("#EF4444");
    expect(result.opacity).toBe(0.5);
  });

  it("parsea DELETE_OBJECT", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "DELETE_OBJECT", target: "selected" }), "Test");
    expect(result.action).toBe("DELETE_OBJECT");
    if (result.action !== "DELETE_OBJECT") throw new Error("Expected DELETE_OBJECT");
    expect(result.target).toBe("selected");
  });

  it("parsea SET_OPACITY", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "SET_OPACITY", value: 0.3, target: "all" }), "Test");
    expect(result.action).toBe("SET_OPACITY");
    if (result.action !== "SET_OPACITY") throw new Error("Expected SET_OPACITY");
    expect(result.value).toBe(0.3);
    expect(result.target).toBe("all");
  });

  it("parsea MOVE_OBJECT", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "MOVE_OBJECT", left: 300, top: 200, target: "last" }), "Test");
    expect(result.action).toBe("MOVE_OBJECT");
    if (result.action !== "MOVE_OBJECT") throw new Error("Expected MOVE_OBJECT");
    expect(result.left).toBe(300);
    expect(result.top).toBe(200);
    expect(result.target).toBe("last");
  });

  it("parsea JSON válido con espacios alrededor", () => {
    const [result] = parseAIResponse(`  ${JSON.stringify({ action: "CLEAR_CANVAS" })}\n`, "Test");
    expect(result.action).toBe("CLEAR_CANVAS");
  });

  it("rechaza action inválido", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "DELETE_EVERYTHING" }), "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza ADD_SHAPE incompleto", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "ADD_SHAPE" }), "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza CHANGE_BG sin color", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "CHANGE_BG" }), "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza ERROR sin mensaje", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "ERROR" }), "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza color hex inválido", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "CHANGE_BG", color: "red" }), "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza JSON inválido", () => {
    const [result] = parseAIResponse("esto no es json", "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza size negativo", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "ADD_SHAPE", shape: "circle", color: "#3B82F6", size: -10 }), "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza size excesivo", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "ADD_SHAPE", shape: "circle", color: "#3B82F6", size: 4096 }), "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza shape no soportado", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "ADD_SHAPE", shape: "star", color: "#3B82F6", size: 100 }), "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza prompt vacío para GENERATE_IMAGE", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "GENERATE_IMAGE", prompt: "" }), "Test");
    expect(result.action).toBe("ERROR");
  });

  it("incluye el nombre del provider en mensaje de error", () => {
    const [result] = parseAIResponse("basura", "Gemini");
    if (result.action !== "ERROR") throw new Error("Expected ERROR");
    expect(result.message).toContain("Gemini");
  });

  it("permite ADD_SHAPE con campos opcionales", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "ADD_SHAPE", shape: "rect", color: "#FF5733", size: 120, left: 100, top: 200, opacity: 0.8 }), "Test");
    expect(result.action).toBe("ADD_SHAPE");
    if (result.action !== "ADD_SHAPE") throw new Error("Expected ADD_SHAPE");
    expect(result.left).toBe(100);
    expect(result.top).toBe(200);
    expect(result.opacity).toBe(0.8);
  });

  it("rechaza opacidad fuera de rango", () => {
    const [result] = parseAIResponse(JSON.stringify({ action: "SET_OPACITY", value: 1.5, target: "all" }), "Test");
    expect(result.action).toBe("ERROR");
  });

  it("rechaza secuencia vacía", () => {
    const [result] = parseAIResponse(JSON.stringify({ actions: [] }), "Test");
    expect(result.action).toBe("ERROR");
  });
});
