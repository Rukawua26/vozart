import { describe, it, expect } from "vitest";
import { buildCspDirectives } from "../../server/security-headers.js";

// Regresión del "pantalla en blanco": Vite inyecta un preámbulo inline de
// React Refresh (<script type="module">) que @vitejs/plugin-react debe
// detectar. Un script-src 'self' estricto lo bloquea en desarrollo. La CSP
// debe permitir ese inline SOLO en desarrollo y mantener 'self' en producción.
describe("buildCspDirectives", () => {
  it("permite el preámbulo inline de Vite en desarrollo", () => {
    const directives = buildCspDirectives(false);
    expect(directives.scriptSrc).toContain("'self'");
    expect(directives.scriptSrc).toContain("'unsafe-inline'");
  });

  it("mantiene script-src 'self' estricto en producción", () => {
    const directives = buildCspDirectives(true);
    expect(directives.scriptSrc).toEqual(["'self'"]);
    expect(directives.scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("no relaja otras directivas sensibles en ningún entorno", () => {
    for (const isProd of [false, true]) {
      const directives = buildCspDirectives(isProd);
      expect(directives.objectSrc).toEqual(["'none'"]);
      expect(directives.frameSrc).toEqual(["'none'"]);
      expect(directives.defaultSrc).toEqual(["'self'"]);
    }
  });
});
