# Spec: Timestamp e Historial Completo

## Objetivo

Mostrar en el historial lateral de VozArt tanto comandos exitosos como errores, incluyendo una hora visible por comando para ayudar a entender que ocurrio durante la sesion actual.

## Usuario / Caso De Uso

Un usuario dicta o escribe comandos para controlar el canvas. Si el comando falla, necesita ver el error en el historial. Si varios comandos se ejecutan seguidos, necesita distinguir el orden aproximado por hora.

## Alcance

- Agregar un timestamp opcional a los comandos almacenados en frontend.
- Asignar timestamp cuando `App` agrega comandos recibidos por WebSocket o errores locales.
- Mostrar hasta 10 comandos recientes en `VoiceControl`.
- Mostrar `AI_ACTION` con estilo exitoso azul.
- Mostrar `ERROR` con estilo de error rojo.
- Mostrar hora local legible en cada item del historial.

## Fuera De Alcance

- No persistir historial entre recargas.
- No modificar backend ni protocolo WebSocket.
- No agregar filtros, busqueda ni export del historial.
- No cambiar `MAX_COMMANDS=50`.
- No agregar timestamps generados por servidor.

## Limites De Contexto

- Leer solo: `src/types.ts`, `src/App.tsx`, `src/components/VoiceControl.tsx`.
- No leer: `server/`, `tests/`, `node_modules/`, `dist/`, `android/`.
- Si aparece una necesidad fuera de estos archivos, actualizar primero `plan.md`.

## Criterios De Aceptacion

- [ ] `AppCommand` permite un `timestamp` opcional sin romper comandos existentes.
- [ ] Todo comando agregado por `addCommand` recibe timestamp si no lo trae.
- [ ] El historial de `VoiceControl` incluye `AI_ACTION` y `ERROR`.
- [ ] El historial muestra hasta 10 comandos recientes, ordenados del mas reciente al mas antiguo.
- [ ] Los errores se ven visualmente distintos con borde rojo y mensaje de error.
- [ ] Los comandos exitosos mantienen estilo azul y muestran accion/prompt como antes.
- [ ] Cada item del historial muestra hora local legible.
- [ ] El estado vacio `No hay historial todavia...` se conserva.

## Casos De Borde

- Historial vacio.
- Solo errores.
- Solo comandos exitosos.
- Mas de 10 comandos.
- Mensaje de error sin `data.message` pero con `message`.
- Comando exitoso sin `prompt`.

## Riesgos

- Cambiar el tipo `AppCommand` puede afectar componentes que lo consumen.
- Un formato de hora dependiente del locale debe ser suficientemente simple para UI.
- No se debe cambiar el contrato WebSocket del backend.

## Preguntas Abiertas

- Ninguna bloqueante.
