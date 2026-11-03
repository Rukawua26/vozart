# QA Checklist

## Web

- [x] Abrir `http://localhost:3000`
- [x] Confirmar que `/api/providers` carga al menos un provider
- [ ] Enviar comando manual y verificar entrada en historial (pendiente de prueba manual en navegador)
- [ ] Ejecutar una accion IA y verificar cambio visible en canvas (pendiente de prueba manual con provider real)
- [x] Exportar PNG y JSON (verificado por inspeccion de codigo y build)
- [x] Crear proyecto nuevo, recargar y confirmar autosave (verificado por inspeccion de codigo y build)
- [x] Importar un `.vozart.json` y verificar restauracion (verificado por inspeccion de codigo y build)
- [ ] Copiar URL compartible y abrirla en otra pestana (pendiente de prueba manual)

## Canvas y accesibilidad

- [ ] Tab hasta el lienzo y usar `Ctrl/Cmd+Z`, `Ctrl/Cmd+Y`, `Delete`, `G`, `0`, `+`, `-`
- [ ] Seleccionar un objeto y moverlo con flechas y `Shift+flechas`
- [x] Activar alto contraste, lectura facil, UI grande y sin motion
- [ ] Verificar `aria-live` del historial y del canvas con lector de pantalla

## Mobile / APK

- Abrir APK con `VITE_SERVER_URL` correcto
- Confirmar conexion con el servidor
- Probar voz y comando manual
- Dibujar, exportar y reabrir el proyecto

## Release gate

- `npm run lint`
- `npm test`
- `npm run build`
