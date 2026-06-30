# Tech Stack

## Tecnologias

- Frontend: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Fabric.js 7
- Backend: Express 4, ws, Helmet, CORS, express-rate-limit, Pino
- IA: Gemini, OpenAI, Anthropic, Ollama
- Mobile: Capacitor 8 Android
- Build: Vite + esbuild
- Tests: Vitest
- CI: GitHub Actions

## Estructura

- `server.ts`: servidor Express + WebSocket, healthcheck, providers y fallback
- `server/ai/`: contrato IA, providers y registry
- `src/App.tsx`: conexion WS, health, capas, proyectos y accesibilidad global
- `src/components/CanvasInclusivo.tsx`: canvas, brushes, capas, export, teclado y persistencia local
- `src/components/VoiceControl.tsx`: voz, historial, proyectos, provider y ajustes de usuario
- `src/services/AIContextManager.ts`: contexto resumido para providers
- `src/services/AIStreamManager.ts`: secuencias de acciones
- `tests/`: parseo IA y managers

## Contratos y flujo

- El cliente envia `VOICE_COMMAND` con `text`, `provider`, `sessionId` y `context`
- El servidor responde `AI_ACTION` o `ERROR`
- `AIAction` ya cubre acciones unicas y secuencias
- El canvas persiste estado bruto en `vozart-canvas-state`
- Los proyectos se persisten en `vozart-projects` y `vozart-active-project`

## Convenciones

- `npm run lint` es `tsc --noEmit`
- Mantener `server.ts` como entrypoint real
- Registrar providers nuevos solo en `server/ai/registry.ts`
- Mantener parsing/validacion en `server/ai/types.ts`
- Preservar UX visible en espanol
- No introducir cambios grandes fuera del roadmap sin actualizar spec

## Operacion

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
npm run apk
```

## Riesgos conocidos

- Persistencia solo local
- Dependencia externa para imagen generada
- APK depende de `VITE_SERVER_URL` correcto en entornos remotos
