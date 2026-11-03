# Feature 003: Modo offline/local

## Estado

Aprobada para implementacion como parte del plan priorizado de VozArt.

## Objetivo

Mantener disponibles el canvas y los proyectos locales cuando no hay red, comunicar ese estado y recuperar la conexion al servidor sin cachear respuestas de API.

## Alcance

- Detectar eventos `online` y `offline` del navegador.
- Evitar reintentos WebSocket mientras el navegador esta offline.
- Recuperar providers y WebSocket al volver la conectividad.
- Mostrar un estado offline distinto del modo local con servidor no disponible.
- Limitar el cache del service worker a navegacion y recursos estaticos same-origin.

## Criterios de aceptacion

- AC-01: sin red, canvas y proyectos locales siguen disponibles.
- AC-02: la UI muestra `Sin conexion` y no intenta enviar comandos IA.
- AC-03: al volver la red, se vuelven a consultar providers y se reconecta el WebSocket.
- AC-04: `/api`, `/health` y peticiones no GET no se guardan en cache.
- AC-05: lint, pruebas y build pasan.

## Fuera de alcance

- Ejecutar modelos IA dentro del navegador.
- Sincronizacion cloud de proyectos.
- Garantizar providers cloud sin acceso a Internet.
