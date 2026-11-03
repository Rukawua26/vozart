# Verification: Selector de proveedor IA

## Estado

PASS. AC-01 a AC-05 quedan cubiertos.

## Evidencia

- La seleccion usa `vozart-ai-provider` y se restaura desde `localStorage`.
- `resolveProviderSelection` conserva preferencias disponibles y aplica fallback al primer provider.
- El selector vacio queda deshabilitado, tiene nombre accesible y muestra una explicacion.
- El provider activo muestra sus modelos declarados por el servidor.

## Comandos

```text
npm test -- tests/frontend/provider-selection.test.ts
RESULT: PASS - 3/3.

npm run lint
RESULT: PASS.

npm test
RESULT: PASS - 88/88.

npm run build
RESULT: PASS.

git diff --check
RESULT: PASS.
```

Las advertencias de Fontconfig emitidas durante la suite provienen de la configuracion del sistema y no causaron fallos.
