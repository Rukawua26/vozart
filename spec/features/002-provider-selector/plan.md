# Plan: Selector de proveedor IA

1. Extraer una funcion pura que mantenga una preferencia valida o elija el primer provider.
2. Inicializar y persistir la seleccion desde `App`.
3. Aplicar la resolucion al recibir `/api/providers`.
4. Mejorar estados accesibles y contexto del selector en `VoiceControl`.
5. Verificar la funcion, TypeScript, pruebas y build.
