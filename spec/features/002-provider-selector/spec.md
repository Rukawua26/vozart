# Feature 002: Selector de proveedor IA

## Estado

Aprobada para implementacion como parte del plan priorizado de VozArt.

## Objetivo

Hacer que el selector de proveedor IA conserve la preferencia del usuario, nunca mantenga una seleccion que el servidor no ofrece y explique el estado vacio.

## Alcance

- Persistir el proveedor seleccionado en `localStorage`.
- Restaurar la preferencia solo si aparece en `/api/providers`.
- Usar el primer proveedor disponible cuando la preferencia ya no existe.
- Deshabilitar el selector y mostrar ayuda cuando no hay providers.
- Mostrar los modelos del proveedor activo como contexto no editable.

## Criterios de aceptacion

- AC-01: una seleccion valida se conserva tras recargar la aplicacion.
- AC-02: una seleccion ausente se reemplaza por el primer provider disponible.
- AC-03: con una lista vacia, el control queda deshabilitado y comunica el motivo.
- AC-04: el selector tiene nombre accesible y muestra los modelos del provider activo.
- AC-05: lint, pruebas y build pasan.

## Fuera de alcance

- Registrar providers nuevos.
- Elegir modelos individuales.
- Comprobar credenciales desde el navegador.
