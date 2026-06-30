import { describe, it, expect, beforeEach } from "vitest";
import { withAlpha } from "../src/lib/utils";
import { createProjectId, parseStoredProjects } from "../src/lib/project";
import type { ProjectSnapshot } from "../src/types";

// Polyfill localStorage for node environment
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = String(value); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

describe("withAlpha", () => {
  it("converts hex to rgba", () => {
    const result = withAlpha("#3B82F6", 0.5);
    expect(result).toBe("rgba(59, 130, 246, 0.5)");
  });

  it("converts hex without hash", () => {
    const result = withAlpha("ff0000", 0.3);
    expect(result).toBe("rgba(255, 0, 0, 0.3)");
  });

  it("handles black", () => {
    const result = withAlpha("#000000", 0.8);
    expect(result).toBe("rgba(0, 0, 0, 0.8)");
  });

  it("handles white", () => {
    const result = withAlpha("#FFFFFF", 0.1);
    expect(result).toBe("rgba(255, 255, 255, 0.1)");
  });

  it("returns original string for invalid hex length", () => {
    const result = withAlpha("#FFF", 0.5);
    expect(result).toBe("#FFF");
  });

  it("handles alpha of 0", () => {
    const result = withAlpha("#10B981", 0);
    expect(result).toBe("rgba(16, 185, 129, 0)");
  });

  it("handles alpha of 1", () => {
    const result = withAlpha("#10B981", 1);
    expect(result).toBe("rgba(16, 185, 129, 1)");
  });
});

describe("createProjectId", () => {
  it("generates a string with project- prefix", () => {
    const id = createProjectId();
    expect(id).toMatch(/^project-\d+$/);
  });

  it("generates unique IDs with subsequent calls", async () => {
    await new Promise(r => setTimeout(r, 2));
    const a = createProjectId();
    await new Promise(r => setTimeout(r, 2));
    const b = createProjectId();
    expect(a).not.toBe(b);
  });
});

describe("parseStoredProjects", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when no data", () => {
    expect(parseStoredProjects()).toEqual([]);
  });

  it("returns empty array on invalid JSON", () => {
    localStorage.setItem("vozart-projects", "not-json");
    expect(parseStoredProjects()).toEqual([]);
  });

  it("returns empty array on non-array JSON", () => {
    localStorage.setItem("vozart-projects", '{"id":"x"}');
    expect(parseStoredProjects()).toEqual([]);
  });

  it("parses valid stored projects", () => {
    const projects: ProjectSnapshot[] = [
      {
        id: "p1",
        name: "Test",
        canvasJson: '{"objects":[]}',
        layers: [{ id: "l1", name: "L1", visible: true }],
        workProfile: "artist",
        collaboratorName: "User",
        updatedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem("vozart-projects", JSON.stringify(projects));
    const result = parseStoredProjects();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test");
  });
});
