<div align="center">

# 🎨 VozArt

### *Lienzo digital interactivo con control por voz e inteligencia artificial*

> Habla. El lienzo obedece. Dibuja formas, cambia colores, genera imágenes con IA y más — todo con tu voz.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=for-the-badge)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=for-the-badge)]()
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=for-the-badge)]()
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)]()
[![Fabric.js](https://img.shields.io/badge/Fabric.js-7-1C1C1C?logoColor=white&style=for-the-badge)]()
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white&style=for-the-badge)]()
[![Android](https://img.shields.io/badge/Android_Capacitor-8-3DDC84?logo=android&logoColor=white&style=for-the-badge)]()
[![Docker](https://img.shields.io/badge/Docker-Node_22-2496ED?logo=docker&logoColor=white&style=for-the-badge)]()

[![Tests](https://img.shields.io/badge/Tests-22_passed-22c55e?style=flat-square)]()
[![Lint](https://img.shields.io/badge/Lint-tsc_clean-22c55e?style=flat-square)]()
[![Build](https://img.shields.io/badge/Build-OK-22c55e?style=flat-square)]()

</div>

---

## ✨ ¿Qué es VozArt?

**VozArt** es una aplicación web interactiva que te permite controlar un lienzo de dibujo digital usando **comandos de voz en español**. Habla y el lienzo obedece al instante.

| Característica | Descripción |
|---|---|
| 🎤 **Control por voz** | Dicta comandos en español, el canvas responde en tiempo real |
| 🤖 **4 proveedores IA** | Gemini, OpenAI, Anthropic y Ollama local — tú eliges |
| 🎨 **Canvas interactivo** | Formas, colores, fondos e imágenes generadas por IA |
| 📱 **APK Android** | Compila como app nativa vía Capacitor 8 |
| ⚡ **WebSocket tiempo real** | Sin esperas, sin recargas |
| 🌐 **PWA** | Service worker para carga rápida |

---

## 🚀 Inicio Rápido

```bash
# 1. Clonar e instalar
git clone https://github.com/Rukawua26/vozart.git
cd vozart
npm install

# 2. Configurar API keys
cp .env.example .env
# Edita .env con al menos una API key de IA

# 3. ¡A dibujar!
npm run dev    # Abre http://localhost:3000
```

---

## 🎮 Cómo Usar

1. Abre `http://localhost:3000`
2. Selecciona un proveedor IA en la barra lateral derecha
3. Habla o escribe comandos como:

| Comando | Ejemplo | Resultado |
|---|---|---|
| Dibujar forma | *"dibuja un círculo rojo grande"* | Círculo rojo en el canvas |
| Cambiar fondo | *"fondo azul oscuro"* | Fondo cambia a #0F172A |
| Generar imagen | *"genera un paisaje con montañas"* | IA genera la imagen |
| Limpiar canvas | *"limpia el lienzo"* | Se borra todo |
| Exportar | *"exporta el dibujo"* | Descarga PNG |

---

## 🤖 Proveedores IA

Cambia de proveedor al instante desde la barra lateral — sin reiniciar el servidor.

| Proveedor | Modelos destacados | Variable de entorno |
|---|---|---|
| **Gemini** | `gemini-2.0-flash`, `gemini-2.0-pro` | `GEMINI_API_KEY` |
| **OpenAI** | `GPT-4o`, `GPT-4o-mini` | `OPENAI_API_KEY` |
| **Anthropic** | `Claude Sonnet 4`, `Claude Haiku` | `ANTHROPIC_API_KEY` |
| **Ollama** | Modelos locales (`Llama 3`, `Mistral`) | `OLLAMA_URL` |

Todos implementan la misma interfaz `AIProvider` y se registran en `server/ai/registry.ts`. Si un proveedor falla, el sistema intenta con el siguiente automáticamente.

---

## 🏗️ Arquitectura

```
App React (Canvas + Voz)
    │
    ├── WebSocket ──▶ Express 4 + ws
    │                       │
    │                       └── AI Registry
    │                           ├── Gemini
    │                           ├── OpenAI
    │                           ├── Anthropic
    │                           └── Ollama
    │
    └── localStorage ──▶ CanvasInclusivo (Fabric.js 7)
```

### Flujo de un comando

1. 🎤 Hablas o escribes un comando en `VoiceControl.tsx`
2. 📡 Se envía por WebSocket: `{ type: "VOICE_COMMAND", text, provider }`
3. 🧠 El servidor selecciona el proveedor y procesa el texto
4. 🎨 `CanvasInclusivo.tsx` aplica la acción al canvas
5. 📋 El resultado aparece en el historial con timestamp

---

## 📱 Android APK

VozArt funciona como app nativa en Android vía **Capacitor 8**:

```bash
npm run apk
# Genera VozArt-Dev-v1.4.0.apk
```

La app mantiene la identidad `com.vozartdev.app` para desarrollo. Incluye permisos de micrófono y está configurada en modo retrato.

---

## 🐳 Docker

```bash
docker build -t vozart .
docker run -p 3000:3000 --env-file .env vozart
```

---

## ✅ Tests y Calidad

| Check | Comando | Estado |
|---|---|---|
| Tests unitarios | `npm test` | ✅ 22 tests passed |
| TypeScript | `npm run lint` | ✅ Sin errores |
| Build producción | `npm run build` | ✅ Build exitoso |

### Tests del contrato IA

El test suite de `parseAIResponse` cubre:

- **Acciones válidas**: `ADD_SHAPE`, `CHANGE_BG`, `CLEAR_CANVAS`, `GENERATE_IMAGE`, `ERROR`
- **Sanitización**: Límite de 1000 caracteres, caracteres de control, tipos nulos
- **Casos borde**: JSON con espacios, size negativo/excesivo, shape no soportado, prompt vacío

---

## 📁 Estructura del Proyecto

```
vozart/
├── server.ts                    # Express + WebSocket (entrypoint)
├── vite.config.ts               # Vite + Tailwind + chunk splitting
├── server/ai/
│   ├── types.ts                 # AIActionSchema, parseAIResponse, sanitizeInput
│   ├── registry.ts              # Registro de proveedores IA
│   ├── gemini.ts / openai.ts    # Implementaciones de cada proveedor
│   ├── anthropic.ts / ollama.ts
├── src/
│   ├── App.tsx                  # WebSocket, estado global, comandos
│   ├── components/
│   │   ├── CanvasInclusivo.tsx   # Canvas Fabric.js 7
│   │   └── VoiceControl.tsx     # Voz, historial, selector de proveedor
│   └── types.ts                 # Tipos compartidos frontend
├── tests/ai/
│   └── parseAIResponse.test.ts  # Tests del contrato IA
├── android/                     # Proyecto Capacitor Android
├── public/                      # Service worker + assets
└── dist/                        # Build de producción
```

---

## 🔧 Variables de Entorno

| Variable | ¿Obligatoria? | Descripción |
|---|---|---|
| `GEMINI_API_KEY` | Para Gemini | API key de Google AI |
| `OPENAI_API_KEY` | Para OpenAI | API key de OpenAI |
| `ANTHROPIC_API_KEY` | Para Anthropic | API key de Anthropic |
| `OLLAMA_URL` | Para Ollama | URL de Ollama local |
| `APP_ACCESS_TOKEN` | Opcional | Token de acceso a endpoints |
| `PORT` | No | Puerto del servidor (default: 3000) |
| `LOG_LEVEL` | No | Nivel de logging (default: info) |
| `DISABLE_HMR` | No | Desactiva HMR para edición por IA |
| `TRUST_PROXY` | No | Detrás de proxy inverso |

---

## 🤝 Contribuir

1. Haz un fork del repositorio
2. Crea una rama: `git checkout -b feature/nueva-mejora`
3. Asegúrate de que `npm test` y `npm run lint` pasen
4. Abre un Pull Request

---

<div align="center">

**VozArt** · Hecho con ❤️ y 🎤 · React 19 · Express · Fabric.js 7 · Capacitor 8

*Dibuja con tu voz, donde sea, como sea.*

</div>
