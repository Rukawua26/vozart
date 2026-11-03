# VozArt visual workflow improvement
Approved implementation scope: make the drawing workflow more practical while preserving existing features and keeping the canvas dominant.

## Specs
S1: User request: "analiza a profundida la parte visual a ver si la podemos mejorar para que sea mas practica me entiendes la idea"
S2: User approval: "si este es le mejor plan ejecutalo"
S3: Keep the canvas as the primary workspace; reduce obstruction from always-visible tool controls by making detailed controls contextual/collapsible.
S4: Group right-panel functions into task-oriented sections and keep the command entry accessible without scrolling through unrelated controls.
S5: Clarify server and AI provider status, and address external-font CSP errors without weakening production CSP.
S6: Preserve current functionality, responsive behavior, and accessibility while making touch targets and labels easier to use.

## Tasks
T1: Map current UI hierarchy and define minimal interaction-preserving layout changes — Spec S3-S6 — inline — DONE.
T2: Implement first-stage visual workflow improvements (grouped sidebar, voice/text composer at top, advanced tools disclosure, server/AI status, system font fallback, correct informational history styling) — Spec S3-S6 — gentle-ai-worker + inline — DONE (11 test files/95 tests, lint, build passed; desktop screenshot observed).
T3: Apply mobile-specific default-collapsed toolbox refinement — Spec S3,S6 — inline — DONE (lint, full suite 95 tests, build passed).
T4: Update Gemini model list (gemini-2.0-flash deprecated → gemini-2.5-flash) — Spec S5 — inline — DONE (model list updated, default model updated, lint + tests pass).
T5: Update Ollama provider model list to match installed models — Spec S5 — inline — DONE (models updated to qwen2.5-coder:7b, qwen3.5:4b, etc.; default changed to qwen2.5-coder:7b).
T6: Verify Ollama end-to-end — BLOCKED (Ollama running but model too heavy for available RAM; chat endpoint responds but takes 26s+). User decided to stop Ollama testing.

## Log
L1: "si este es le mejor plan ejecutalo"
L2: Current hierarchy and friction confirmed from VoiceControl.tsx, CanvasInclusivo.tsx, App.tsx, index.css and screenshots.
L3: Writer RED/GREEN: three VoiceControl tests. Full suite 95 tests, lint, build passed.
L4: Desktop screenshot exposed success notices styled as errors and OFF health chip; fixed.
L5: Mobile screenshot showed toolbox covering canvas; changed to default-collapsed with accessible toggle.
L6: Smoke test with user API key revealed gemini-2.0-flash deprecated; updated model list to gemini-2.5-flash. API key had restricted access (no longer available to new users) — not a code bug. Key removed from .env after test.
L7: Final verification: lint OK, 95 tests OK, build OK.
L8: Ollama installed and running with qwen2.5-coder:7b, dolphin-phi, phi4-mini, qwen3.5:4b, qwen2.5-coder:3b. Ollama provider model list updated to match. Chat endpoint responds but model takes 26s+ to generate. User decided to stop testing due to insufficient RAM. Ollama and VozArt server stopped. .env restored to placeholder. Temporary test files removed.
