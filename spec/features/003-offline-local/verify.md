# Verification: Modo offline/local

## Estado

PASS. AC-01 a AC-05 quedan cubiertos por implementacion y verificaciones automatizadas.

## Evidencia

- `App` escucha los eventos `online` y `offline` y distingue `Sin conexion` de `Local`.
- El envio offline conserva el canvas y los proyectos y evita comandos IA imposibles.
- La vuelta a online recarga `/api/providers` y reinicia el WebSocket.
- El service worker ignora APIs, health, origenes externos y peticiones no GET.
- La documentacion diferencia uso local de disponibilidad de providers IA.

## Comandos

```text
npm run lint
RESULT: PASS.

npm test
RESULT: PASS - 88/88.

npm run build
RESULT: PASS.

git diff --check
RESULT: PASS.
```

Las advertencias de Fontconfig emitidas durante la suite son externas al proyecto y no causaron fallos.
