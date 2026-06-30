# Plan: Timestamp e Historial Completo

## Prompt Engineering

- Rol: desarrollador TypeScript/React especializado en VozArt.
- Contexto: app de dibujo por voz con WebSocket, historial en `VoiceControl` y comandos en `App`.
- Tarea: agregar timestamp local y mostrar historial completo segun criterios de aceptacion.
- Restricciones: no tocar backend, no modificar protocolo WebSocket, no refactorizar fuera del plan, no leer archivos no listados en la spec.
- Formato: completar tareas, registrar verificacion en `verify.md`, reportar archivos y comandos.

## Enfoque Tecnico

- Extender `AppCommand` con `timestamp?: string`.
- Centralizar la asignacion de timestamp en `addCommand` para cubrir mensajes WebSocket y errores locales.
- Reemplazar el filtro actual de historial para incluir ambos tipos de comando.
- Usar estilos condicionales con `cn()` para diferenciar `AI_ACTION` y `ERROR`.
- Formatear la hora con `new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`.

## Archivos Afectados

- `src/types.ts`: agregar `timestamp?: string` a cada variante de `AppCommand`.
- `src/App.tsx`: agregar timestamp por defecto en `addCommand`.
- `src/components/VoiceControl.tsx`: mostrar 10 items, errores, timestamp y estilos condicionales.

## Estructura De Datos

```ts
export type AppCommand =
  | { type: 'AI_ACTION'; data: AIAction; timestamp?: string }
  | { type: 'ERROR'; data?: AIAction; message?: string; timestamp?: string };
```

## Decisiones De Implementacion

- Timestamp opcional para mantener compatibilidad con mensajes recibidos del servidor.
- Timestamp se genera en cliente porque la feature es de sesion y UI.
- No se cambia `MAX_COMMANDS=50`; solo se muestran los ultimos 10.
- No se agregan dependencias para formateo de fechas.

## Loop Auto-Correctivo

Por cada bloque de implementacion:

1. Implementar cambio minimo.
2. Ejecutar verificacion relevante.
3. Si falla, corregir dentro del alcance.
4. Repetir hasta pasar o documentar bloqueo.

## Estrategia De Testing

- Ejecutar `npm run lint` para typecheck.
- Ejecutar `npm run build` para validar build frontend y bundle server.
- Ejecutar `npm test` si la suite disponible no requiere entorno adicional.

## Riesgos Tecnicos

- TypeScript puede requerir narrowing explicito para `ERROR`.
- Mensajes largos deben seguir truncados con `line-clamp-2`.
- La animacion de `AnimatePresence` no debe usar keys inestables si se puede evitar.
