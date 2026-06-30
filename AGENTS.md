# AGENTS.md

## Knowledge Base
- Nota de proyecto en `~/docs/agent-context/summaries/vozart.md` (con YAML frontmatter y wikilinks).
- Área [[AI Providers]] en `~/docs/areas/ai-providers.md` para contexto de proveedores multi-provider.
- MOC central: `~/docs/_MOC.md`.

## Commands
- Use Node.js 22+ and `npm install`; this repo has a `package-lock.json` and Docker uses `npm ci`.
- `npm run dev` starts the combined Express + Vite middleware server on `http://localhost:3000` via `tsx server.ts`.
- `npm run build` must pass for production: it runs Vite with `NODE_OPTIONS=--disable-warning=DEP0205` for Tailwind's Node deprecation warning, then bundles `server.ts` to `dist/server.cjs` with esbuild.
- `npm start` only works after `npm run build`; it runs `NODE_ENV=production node dist/server.cjs`.
- `npm run lint` is TypeScript checking only (`tsc --noEmit`); there is no ESLint config.
- `npm test` runs `vitest run`; focused tests can be run as `npm test -- tests/ai/parseAIResponse.test.ts`.

## Architecture
- `server.ts` is the real backend entrypoint in both dev and prod; it owns Express middleware, `/health`, `/api/providers`, WebSocket voice-command handling, provider fallback, rate limits, and static `dist` serving in production.
- Frontend entrypoint is `src/main.tsx`; `src/App.tsx` opens the WebSocket at the current host and fetches provider metadata from `/api/providers`.
- AI providers live in `server/ai/`; register new providers in `server/ai/registry.ts` and keep response validation in `server/ai/types.ts` (`AIActionSchema`, `SYSTEM_PROMPT`, `sanitizeInput`, `parseAIResponse`).
- Canvas behavior is concentrated in `src/components/CanvasInclusivo.tsx`; it persists state to `localStorage` under `vozart-canvas-state` and uses Fabric.js 7 APIs.
- `VoiceControl` uses browser `SpeechRecognition`/`webkitSpeechRecognition` with `lang = 'es-ES'`; manual text input is the fallback when speech is unsupported.

## Environment And Runtime
- Copy `.env.example` to `.env` for local AI calls; missing provider keys return provider-specific `ERROR` actions rather than failing server startup.
- `OLLAMA_URL` defaults to `http://localhost:11434`; cloud providers read `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY`.
- `APP_ACCESS_TOKEN` gates `/api/providers` and WebSocket access when set; bundled clients need matching `VITE_APP_ACCESS_TOKEN`.
- `AI_PROVIDER_TIMEOUT_MS` defaults to `15000`; fallback moves to the next provider after that timeout.
- Set `TRUST_PROXY` only behind a trusted reverse proxy so HTTP/WS rate limits use forwarded client IPs correctly.
- In production, CORS and WebSocket origin checks use `APP_URL` (default `http://localhost:$PORT`); set it correctly when deploying behind a real host.
- Vite alias `@` points to the repository root, not `src`.
- `DISABLE_HMR=true` disables Vite HMR and file watching in `vite.config.ts`; preserve this AI Studio/agent-editing behavior.

## Android / Capacitor
- Current dev Android identity is `com.vozartdev.app` / `VozArt Dev` in both `capacitor.config.ts` and `android/app/build.gradle`; do not switch it back to the beta package unless explicitly requested.
- `npm run apk` builds web assets, runs `npx cap sync android`, then Gradle release assembly with `ANDROID_HOME=$HOME/Android/Sdk` and `JAVA_HOME=/usr/lib/jvm/java-21-openjdk`.
- Release APK signing falls back to `android/app/debug.keystore` unless `android/release-signing.properties` exists; do not add signing secrets to the repo.
- Android manifest is portrait-only and requests microphone permissions; web manifest is landscape PWA, so check both when changing app orientation or names.

## Gotchas
- `package.json` version is `1.4.0`, but the lockfile root still says `1.2.0`; avoid unrelated version churn unless updating release metadata deliberately.
- `public/sw.js` caches `/`, `/index.html`, and `/manifest.json` as `vozart-v1`; stale PWA/service-worker behavior can survive frontend changes.
- `GENERATE_IMAGE` loads remote images from `https://image.pollinations.ai`; keep server CSP `imgSrc` in `server.ts` aligned with any image-source changes.
