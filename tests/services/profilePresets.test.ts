import { describe, it, expect } from "vitest";
import { PROFILE_PRESETS, getProfilePreset } from "../../src/services/profilePresets";

const PROFILES = ["artist", "architecture", "medical", "legal", "education", "diagram"] as const;

describe("profilePresets", () => {
  it("tiene los 6 perfiles", () => {
    expect(Object.keys(PROFILE_PRESETS)).toHaveLength(6);
  });

  it("cada perfil tiene label y descripcion no vacios", () => {
    for (const key of PROFILES) {
      const p = getProfilePreset(key);
      expect(p.label).toBeTruthy();
      expect(p.description).toBeTruthy();
    }
  });

  it("cada perfil tiene exactamente 8 colores en la paleta", () => {
    for (const key of PROFILES) {
      expect(getProfilePreset(key).palette).toHaveLength(8);
    }
  });

  it("cada perfil tiene brush valido", () => {
    const validBrushes = ["pencil", "circle", "spray", "ink", "charcoal", "watercolor"];
    for (const key of PROFILES) {
      expect(validBrushes).toContain(getProfilePreset(key).brush);
    }
  });

  it("cada perfil tiene brushWidth positivo", () => {
    for (const key of PROFILES) {
      expect(getProfilePreset(key).brushWidth).toBeGreaterThan(0);
    }
  });

  it("cada perfil tiene layersNames con al menos 1 elemento", () => {
    for (const key of PROFILES) {
      expect(getProfilePreset(key).layersNames.length).toBeGreaterThan(0);
    }
  });

  it("cada perfil tiene aiHint no vacio", () => {
    for (const key of PROFILES) {
      expect(getProfilePreset(key).aiHint).toBeTruthy();
    }
  });

  it("getProfilePreset con clave invalida devuelve artista", () => {
    const p = getProfilePreset("invalid" as any);
    expect(p.key).toBe("artist");
  });

  it("showGrid es true solo para architecture y legal", () => {
    expect(getProfilePreset("architecture").showGrid).toBe(true);
    expect(getProfilePreset("legal").showGrid).toBe(true);
    expect(getProfilePreset("artist").showGrid).toBe(false);
    expect(getProfilePreset("medical").showGrid).toBe(false);
    expect(getProfilePreset("education").showGrid).toBe(false);
    expect(getProfilePreset("diagram").showGrid).toBe(false);
  });
});
