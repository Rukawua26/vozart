# Accesibilidad y Perfiles VozArt

## Ajustes implementados
- Alto contraste global.
- Lectura facil mediante espaciado visual aumentado.
- UI grande para controles y lectura mas comoda.
- Reduccion de animaciones para personas sensibles al movimiento.
- Canvas enfocable con atajos: `Ctrl+Z`, `Ctrl+Y`, `Delete/Backspace`, `G`.
- `aria-live` para historial de comandos y errores.

## Perfiles de uso implementados
- Artista: composicion libre, color y textura.
- Educacion: recursos visuales claros y explicativos.
- Arquitectura: grid, formas y proporciones.
- Medico: diagramas claros y etiquetas.
- Legal: esquemas, flujos y evidencias visuales.
- Diagramas: formas, texto y relaciones.

## Dispositivos adaptativos futuros
- Eye tracking: requiere capa de entrada adicional que traduzca mirada a foco/click.
- Switch control: puede mapearse a navegacion por teclado si todos los controles son focusables.
- Lectores de pantalla: mantener `aria-label`, `aria-live` y textos visibles equivalentes.
- Stylus: ya existe base con pointer events; siguiente paso es calibracion por presion/inclinacion.

## Colaboracion futura
- Base sugerida: eventos de canvas serializados por WebSocket.
- Requiere identidad de usuario, sesiones, cursor remoto y resolucion de conflictos.

---
*Documento actualizado: 2026-06-28*
