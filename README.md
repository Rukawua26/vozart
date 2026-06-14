# VozArt 🎨

Lienzo digital interactivo con control por voz e inteligencia artificial.

## Stack

- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Fabric.js 7
- **Backend:** Express, WebSockets, pino
- **IA:** Gemini, OpenAI, Anthropic, Ollama (seleccionable en UI)

## Requisitos

- Node.js 22+
- Al menos una API key de IA (ver `.env.example`)

## Desarrollo

```bash
npm install
cp .env.example .env   # Configurar API keys
npm run dev            # http://localhost:3000
```

## Producción

### Build

```bash
npm run build
npm start              # node dist/server.cjs
```

### Docker

```bash
docker build -t vozart .
docker run -p 3000:3000 --env-file .env vozart
```

### Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `GEMINI_API_KEY` | Para Gemini | Google AI API key |
| `OPENAI_API_KEY` | Para OpenAI | OpenAI API key |
| `ANTHROPIC_API_KEY` | Para Anthropic | Anthropic API key |
| `OLLAMA_URL` | Para Ollama | URL de Ollama local |
| `PORT` | No | Puerto del servidor (default: 3000) |
| `LOG_LEVEL` | No | Nivel de logging (default: info) |

## Proveedores IA

Selecciona el proveedor en la barra lateral derecha. Soporta:

- **Gemini** — Google AI (`gemini-2.0-flash`, etc.)
- **OpenAI** — GPT-4o, GPT-4o-mini, etc.
- **Anthropic** — Claude Sonnet 4, Claude Haiku, etc.
- **Ollama** — Modelos locales (Llama 3, Mistral, etc.)
