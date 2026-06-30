import { describe, it, expect } from "vitest";
import type { ProjectSnapshot } from "../../src/types";

function makeValidProject(overrides?: Partial<ProjectSnapshot>): ProjectSnapshot {
  return {
    id: "project-test-123",
    name: "Test Project",
    canvasJson: JSON.stringify({ version: "7.3.1", objects: [] }),
    layers: [{ id: "layer-1", name: "Capa 1", visible: true, locked: false, opacity: 1 }],
    workProfile: "artist",
    collaboratorName: "TestUser",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("ProjectSnapshot", () => {
  it("se crea con valores minimos", () => {
    const p = makeValidProject();
    expect(p.id).toBeTruthy();
    expect(p.name).toBeTruthy();
    expect(p.canvasJson).toBeTruthy();
    expect(p.layers).toHaveLength(1);
  });

  it("acepta capas con locked y opacity", () => {
    const p = makeValidProject({
      layers: [
        { id: "l1", name: "L1", visible: true, locked: true, opacity: 0.5 },
      ],
    });
    expect(p.layers[0].locked).toBe(true);
    expect(p.layers[0].opacity).toBe(0.5);
  });

  it("exporta a JSON y se parsea de vuelta", () => {
    const p = makeValidProject({
      workProfile: "architecture",
      layers: [
        { id: "l1", name: "Boceto", visible: true },
        { id: "l2", name: "Cotas", visible: false, locked: true, opacity: 0.7 },
      ],
    });
    const json = JSON.stringify(p);
    const parsed = JSON.parse(json) as ProjectSnapshot;
    expect(parsed.workProfile).toBe("architecture");
    expect(parsed.layers).toHaveLength(2);
    expect(parsed.layers[1].locked).toBe(true);
    expect(parsed.layers[1].opacity).toBe(0.7);
  });

  it("rechaza projecto sin canvasJson", () => {
    const bad = { id: "x", name: "x" };
    const parsed = bad as ProjectSnapshot;
    expect(parsed.canvasJson).toBeUndefined();
  });

  it("rechaza projecto sin layers", () => {
    const bad = { id: "x", name: "x", canvasJson: "{}" };
    const parsed = bad as ProjectSnapshot;
    expect(parsed.layers).toBeUndefined();
  });

  it("rechaza projecto sin workProfile", () => {
    const bad = { id: "x", name: "x", canvasJson: "{}", layers: [] };
    const parsed = bad as ProjectSnapshot;
    expect(parsed.workProfile).toBeUndefined();
  });

  it("serializa correctamente un proyecto con todos los campos", () => {
    const p = makeValidProject();
    const json = JSON.stringify(p);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(p.id);
    expect(parsed.name).toBe(p.name);
    expect(parsed.canvasJson).toBe(p.canvasJson);
    expect(parsed.workProfile).toBe(p.workProfile);
    expect(parsed.collaboratorName).toBe(p.collaboratorName);
    expect(parsed.updatedAt).toBe(p.updatedAt);
  });

  it("tolera falta de locked u opacity en capas", () => {
    const p = makeValidProject({
      layers: [{ id: "l1", name: "Minima", visible: true }],
    });
    expect(p.layers[0].locked).toBeUndefined();
    expect(p.layers[0].opacity).toBeUndefined();
  });
});
