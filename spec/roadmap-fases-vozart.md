# Roadmap de Fases VozArt

## Estado General
- Fase actual: Fase 5 - Completitud vision original
- Estado actual: Items incompletos + no implementados
- Inicio del plan: 2026-06-28
- Ultima actualizacion: 2026-06-29

## Como usar este documento
- Marca cada tarea completada con `[x]`.
- Actualiza `Fase actual` cuando cambiemos oficialmente de fase.
- No se pasa a la siguiente fase hasta cumplir los criterios de terminado.
- Cuando una fase termine, registra la fecha real de cierre.

---

## Fase 1: Base Usable

### Objetivo
Consolidar VozArt como una aplicacion estable, clara y util para dibujo por voz y edicion manual basica.

### Alcance
- Flujo confiable de comandos por voz y texto.
- Canvas estable para dibujo libre, formas y edicion basica.
- Exportacion y persistencia funcionales.
- Historial claro de acciones y errores.
- UX consistente en desktop y mobile.
- Accesibilidad base suficiente para uso real.

### Tareas
- [x] Canvas base con dibujo libre, formas, color, borrar y exportacion
- [x] WebSocket conectado a proveedores IA con fallback
- [x] Historial de comandos y errores visible
- [x] Persistencia local del canvas
- [x] Revisar y corregir flujo completo voz -> servidor -> accion -> canvas
- [x] Mejorar mensajes de error para que sean mas accionables para el usuario
- [x] Revisar accesibilidad base: foco visible, labels, navegacion y estados
- [x] Validar experiencia mobile completa sin bloqueos de uso
- [x] Revisar consistencia de acciones IA vs capacidades reales del canvas
- [x] Documentar limitaciones actuales del MVP para evitar falsas expectativas
- [x] Ejecutar validacion tecnica final: lint, test y build

### Criterios de terminado
- El usuario puede abrir la app y empezar a crear sin configuracion compleja.
- Puede dictar o escribir comandos y recibir una respuesta consistente.
- Puede corregir manualmente el resultado en el canvas.
- Puede exportar su trabajo sin errores.
- La experiencia mobile es usable.
- Los errores mas comunes se entienden facilmente.
- `npm run lint`, `npm test` y `npm run build` pasan.

### Estado
- Estado: Terminada
- Fecha de cierre: 2026-06-28

### Notas de avance
- El repositorio ya cubre gran parte de esta fase.
- Lo que falta aqui es mas de solidez, UX y validacion que de nuevas funciones grandes.

---

## Fase 2: VozArt Diferencial

### Objetivo
Convertir VozArt en una herramienta claramente distinta a un canvas comun con prompts basicos.

### Alcance
- IA que responda por pasos o refinamientos, no solo con una accion cerrada.
- Herramientas artisticas mas ricas.
- Capas reales y flujo de refinamiento.
- Mejor soporte para stylus.
- Comandos mas expresivos sobre estilo, composicion y detalle.

### Tareas
- [x] Diseñar un contrato IA mas rico que `ADD_SHAPE` y `GENERATE_IMAGE`
- [x] Permitir secuencias de acciones IA sobre el canvas
- [x] Agregar mas pinceles y parametros de trazo
- [x] Agregar opacidad, texturas o mezcla basica de color
- [x] Implementar sistema real de capas
- [x] Permitir ocultar, bloquear, renombrar y reordenar capas
- [x] Mejorar soporte para stylus con mas control de dibujo
- [x] Permitir refinamiento de elementos generados por IA
- [x] Mejorar parser de comandos para estilo, posicion y composicion
- [x] Validacion tecnica final de la fase

### Criterios de terminado
- El usuario puede cocrear con la IA en varios pasos.
- El canvas permite refinamiento manual serio.
- Existen capas reales usables.
- La app ya se percibe como una propuesta diferente frente a un generador de imagen simple.

### Estado
- Estado: Terminada
- Fecha de cierre: 2026-06-28

### Notas de avance
- Esta es la fase mas importante para diferenciar el producto.

---

## Fase 3: Accesibilidad Universal y Casos Pro

### Objetivo
Expandir VozArt para distintos tipos de usuario, necesidades de accesibilidad y perfiles profesionales.

### Alcance
- Accesibilidad avanzada.
- Personalizacion de interfaz.
- Soporte para lectores de pantalla, teclado y dispositivos adaptativos.
- Modos o flujos segun perfil de uso.
- Base futura para colaboracion en tiempo real.

### Tareas
- [x] Implementar modo de alto contraste y simplificacion visual
- [x] Mejorar navegacion por teclado en toda la app
- [x] Mejorar soporte para lector de pantalla
- [x] Definir ajustes de interfaz personalizables
- [x] Diseñar flujos accesibles para movilidad reducida y neurodivergencia
- [x] Evaluar integracion futura con eye tracking u otros dispositivos adaptativos
- [x] Definir modos por perfil: artista, educacion, arquitectura, diagramas, etc.
- [x] Preparar base funcional para colaboracion o sesiones compartidas
- [x] Validacion tecnica y funcional de accesibilidad

### Criterios de terminado
- La app puede adaptarse a distintos tipos de usuario.
- La accesibilidad deja de ser basica y pasa a ser una parte central del producto.
- VozArt ya no depende de un unico perfil de uso.

### Estado
- Estado: Terminada
- Fecha de cierre: 2026-06-28

---

## Reglas de Avance
- No pasar de fase hasta cumplir sus criterios de terminado.
- Si aparece trabajo nuevo, asignarlo a una fase antes de ejecutarlo.
- Si una tarea bloquea a otra, anotarlo explicitamente en este documento.
- Cada cierre de fase debe incluir validacion manual y tecnica.

## Registro de Cierres

### Fase 1
- Estado final: Terminada
- Fecha de cierre: 2026-06-28
- Validacion manual: lint, test, build pasan. Flujo voz -> servidor -> canvas revisado y corregido. Errores mejorados. Accesibilidad base agregada.
- Validacion tecnica: tsc --noEmit, vitest (22/22), build produccion OK

### Fase 2
- Estado final: Terminada
- Fecha de cierre: 2026-06-28
- Validacion manual: Nuevo contrato IA con 10 acciones + secuencias. Handlers en canvas para ADD_TEXT, MODIFY_OBJECT, DELETE_OBJECT, SET_OPACITY, MOVE_OBJECT. Opacidad y brush type selector. Sistema de capas real en sidebar. Stylus via pointer events.
- Validacion tecnica: tsc --noEmit, vitest (31/31), build produccion OK

### Fase 3
- Estado final: Terminada
- Fecha de cierre: 2026-06-28
- Validacion manual: Alto contraste, lectura facil, UI grande, reduccion de motion, perfiles de uso y atajos de teclado implementados. Documento `spec/accessibility-profiles.md` creado.
- Validacion tecnica: tsc --noEmit, vitest (31/31), build produccion OK

### Bloque A (Fase 4)
- Estado final: Cerrado
- Fecha de cierre: 2026-06-28
- Validacion manual: AIContext y AIStream conectados al flujo de comandos. `/api/health` activo en UI footer. Proveedores IA reciben contexto.
- Validacion tecnica: tsc --noEmit OK, vitest 41/41 OK, build produccion OK

---

## Fase 4: Estabilidad y diferenciacion

### Objetivo
Cerrar pendientes reales del proyecto y empezar la diferenciacion, sin crear archivos sueltos que rompan el sistema.

### Bloque A: infraestructura + IA con contexto + health check (CERRADO)
- [x] Tipos: UserPattern, AIContext, StreamStatus agregados en `src/types.ts`.
- [x] `AIContextManager` reescrito y exportado en `src/services/`.
- [x] `AIStreamManager` reescrito y exportado en `src/services/`.
- [x] Endpoint `GET /api/health` con version, uptime, providers y origenes WS.
- [x] Cliente hace healthcheck a `/api/health` cada 30 s y muestra estado en el footer.
- [x] Provider IA recibe `context` y `sessionId` desde el cliente y lo inyecta al `SYSTEM_PROMPT`.
- [x] Tests unitarios nuevos en `tests/services/aiManagers.test.ts`.
- [x] `npm run lint`, `npm test` (41/41), `npm run build` pasan.

### Bloque B: producto
- [x] Perfiles por profesion con presets reles (paleta, brush, shape).
- [x] Capas: bloquear, reordenar, mover entre capas, opacidad por capa.
- [x] Brushes pro (oleo, acuarela, carboncillo, spray, texturados).

### Bloque C: colaboracion + persistencia
- [x] Autosave de proyectos, import/export.
- [x] URL compartible, identidad minima para colaboracion futura.

### Bloque D: accesibilidad profunda
- [x] Navegacion por teclado completa en canvas.
- [x] Lector de pantalla apoya acciones del canvas.
- [x] Flujos para neurodivergencia y movilidad reducida.

### Bloque E: QA y documentacion
- [x] Reescribir `README.md`, `spec/limitations-mvp.md`, `spec/constitution/tech-stack.md`.
- [x] Checklist e2e/manual (voz/manual -> WS -> canvas) para web y APK.
- [x] Checklist y validacion final en CI.

### Estado
- Estado: Terminada
- Fecha de cierre: 2026-06-29

### Estabilizacion (hotfix post-cierre)
- Fecha: 2026-06-29
- Bugfixes: 13 bugs corregidos (activeselection, setActiveLayerId no-op, resetView sin memo, capas sin teclado, aria-labels, color picker label, autosaveStatus, onReassignObject muerto, projects opacidad label)
- Tests: de 41 a 67 (5 archivos)
- IA: contexto de perfil activo inyectado en cada comando
- Service worker: v2 con network-first y skipWaiting
- Version: 1.4.0 -> 1.5.0
- APK: compilado verificado

---

## Fase 5: Completitud vision original

### Objetivo
Cubrir los items incompletos y no implementados del documento de vision original.

### Bloque A: Items incompletos
- [x] Zoom y microdetalle (lupa) en CanvasInclusivo
- [x] Screen reader completo con navegacion semantica de objetos
- [x] Modo Inspiracion: IA sugiere ideas al usuario
- [x] Correccion inteligente: IA refina trazos manuales del usuario

### Bloque B: Items no implementados
- [x] Hand/gesture tracking con MediaPipe
- [x] Eye tracking
- [x] Animacion / escenas en movimiento
- [x] Dibujo vectorial
- [x] Colaboracion en tiempo real

### Estado
- Estado: Terminada
- Fecha de cierre: 2026-06-29

---

## Fase 6: Pinceles realistas y VozArt Story

### Objetivo
Cubrir el resto de items del documento vision original: pinceles realistas, presion stylus, mezcla de colores, modo historia y refinamientos finales.

### Bloque A: Pinceles realistas + stylus
- [x] Presion e inclinacion stylus via PointerEvent
- [x] Pincel oleo (OilBrush) con overlapping circles + jitter + presion
- [x] Pincel acuarela avanzado (WatercolorBrush) con multiply + edge bleed
- [x] Pincel carboncillo avanzado (CharcoalBrush) con textura de grano
- [x] Spray avanzado (EnhancedSprayBrush) con gravedad + variacion de color
- [x] Herramienta difuminar (SmudgeBrush) con sampleo de color canvas + arrastre

### Bloque B: Mezcla de colores + fusion IA
- [x] Modos de fusion (multiply, screen, overlay, soft-light, difference, etc.)
- [x] HARMONIZE_STROKE: IA armoniza trazos recien dibujados

### Bloque C: VozArt Story
- [x] Modo Historia con narracion → escenas secuenciales
- [x] STORY_SCENE: IA genera escenas con transiciones y timing

### Bloque D: Refinamientos finales
- [x] Importar imagen de referencia (semi-transparente, no interactiva)
- [x] Exportar JPG
- [x] Snapping inteligente (guias de alineacion en object:moving)
- [x] Modo manual/auto (acciones IA pendientes requieren confirmacion)
- [x] Modo lectura facil (escala UI + simplify labels)

### Estado
- Estado: Terminada
- Fecha de inicio: 2026-06-29
- Fecha de cierre: 2026-06-29
