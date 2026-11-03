export type CspDirectives = Record<string, string[]>;

// Construye las directivas de Content-Security-Policy.
//
// En desarrollo, Vite inyecta un preámbulo inline de React Refresh
// (<script type="module">) que @vitejs/plugin-react necesita detectar. Un
// script-src 'self' estricto bloquea ese inline y deja la pantalla en blanco
// ("@vitejs/plugin-react can't detect preamble"). Por eso relajamos script-src
// con 'unsafe-inline' SOLO en desarrollo.
//
// En producción NUNCA se relaja: el bundle estático no usa scripts inline y
// script-src permanece en 'self'. El resto de directivas sensibles
// (objectSrc/frameSrc 'none', defaultSrc 'self') son idénticas en ambos
// entornos.
export function buildCspDirectives(isProduction: boolean): CspDirectives {
  const scriptSrc = isProduction
    ? ["'self'"]
    : ["'self'", "'unsafe-inline'"];
  return {
    defaultSrc: ["'self'"],
    scriptSrc,
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "https://image.pollinations.ai", "data:", "blob:"],
    connectSrc: ["'self'", "ws:", "wss:"],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  };
}
