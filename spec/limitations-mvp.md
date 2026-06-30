# Limitaciones actuales del MVP

## IA

- La IA ya soporta secuencias y mas acciones, pero sigue dependiendo de prompts breves y no garantiza composiciones complejas.
- No existe colaboracion en tiempo real; la URL compartible solo recupera el proyecto local referenciado.
- `GENERATE_IMAGE` depende de `pollinations.ai` y puede fallar por red o limites externos.

## Canvas

- No hay presion ni inclinacion real de stylus.
- Los brushes pro son presets visuales sobre brushes Fabric; no simulan fisica real de oleo o acuarela.
- No hay texto enriquecido, conectores inteligentes ni snapping avanzado.
- El movimiento entre capas es util pero no hay panel de objetos por capa.

## Persistencia

- Los proyectos viven en `localStorage`; no hay nube, cuentas ni sincronizacion entre dispositivos.
- La URL compartible necesita que el proyecto exista en el navegador que la abre o que antes se importe el archivo.
- No hay versionado fino ni historial de snapshots entre sesiones.

## Accesibilidad

- Hay atajos, anuncios, lupa de aumento, lista semantica de objetos navegable por teclado, y modos de interfaz, pero no existe navegacion completa por todos los objetos desde una lista semantica en el lector de pantalla del sistema operativo.
- No hay soporte para eye tracking ni hardware adaptativo dedicado.

## Infraestructura

- No hay autenticacion de usuarios finales.
- El service worker sigue siendo basico; no ofrece offline total para assets dinamicos ni providers IA.
- La colaboracion en tiempo real usa salas WebSocket basicas sin historial de cambios ni conflictos.
- El eye tracking usa FaceLandmarker de MediaPipe y estimacion de iris; no es clinico ni alta precision.
- El hand tracking usa MediaPipe HandLandmarker; requiere buena iluminacion y camara frontal.
- Los pinceles pro (oleo/acuarela/carboncillo) usan simulacion visual en contextTop; el path finalizado es un path normal de Fabric.js.
- El smudge (difuminar) muestrea color del canvas; no es una simulacion fisica real de arrastre de pigmento.
- El snapping usa guias visuales basicas (alineacion a bordes/centro); no tiene snapping a grid ni a objetos rotados.
- El modo manual retiene acciones IA pendientes para confirmacion; no permite editar la accion antes de ejecutar.
- El modo lectura facil escala la UI con CSS transform; no reestructura el layout.

Actualizado: 2026-06-29
