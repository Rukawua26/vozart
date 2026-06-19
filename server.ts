import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pino from "pino";
import dotenv from "dotenv";
import { getProvider, listProviders } from "./server/ai/registry.js";

interface AliveWebSocket extends WebSocket {
  isAlive?: boolean;
}

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});

const PORT = parseInt(process.env.PORT || "3000", 10);
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/providers", (_req, res) => {
  res.json(listProviders().map(p => ({ name: p.name, displayName: p.displayName, models: p.models })));
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, `Servidor VozArt corriendo`);
  });

  const wss = new WebSocketServer({ server });
  const wsRateLimit = new Map<string, number[]>();

  const cleanupRateLimit = setInterval(() => {
    const cutoff = Date.now() - 60_000;
    for (const [ip, timestamps] of wsRateLimit) {
      const filtered = timestamps.filter(t => t > cutoff);
      if (filtered.length === 0) wsRateLimit.delete(ip);
      else wsRateLimit.set(ip, filtered);
    }
  }, 60_000);

  const heartbeat = setInterval(() => {
    wss.clients.forEach((client) => {
      const ws = client as AliveWebSocket;
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on("close", () => {
    clearInterval(cleanupRateLimit);
    clearInterval(heartbeat);
  });

  wss.on("connection", (ws: WebSocket, req) => {
    const aliveWs = ws as AliveWebSocket;
    aliveWs.isAlive = true;
    const clientIp = req.socket.remoteAddress || "unknown";
    logger.info({ clientIp }, "Cliente conectado");

    ws.on("pong", () => {
      aliveWs.isAlive = true;
    });

    ws.on("message", async (data) => {
      const now = Date.now();
      const timestamps = wsRateLimit.get(clientIp) || [];
      const recent = timestamps.filter(t => now - t < 60_000);
      if (recent.length >= 20) {
        ws.send(JSON.stringify({ type: "ERROR", message: "Demasiadas solicitudes. Espera un momento." }));
        return;
      }
      recent.push(now);
      wsRateLimit.set(clientIp, recent);

      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === "VOICE_COMMAND") {
          const providerName = payload.provider || "gemini";
          const provider = getProvider(providerName);

          if (!provider) {
            ws.send(JSON.stringify({ type: "ERROR", message: `Proveedor AI "${providerName}" no disponible` }));
            return;
          }

          logger.info({ provider: providerName, text: payload.text }, "Procesando comando");

          const result = await provider.processCommand(payload.text, {
            model: payload.model,
          });

          ws.send(JSON.stringify({ type: "AI_ACTION", data: result }));
        }
      } catch (error) {
        logger.error({ err: error }, "Error procesando mensaje");
        ws.send(JSON.stringify({ type: "ERROR", message: "Error al procesar el comando" }));
      }
    });

    ws.on("close", () => {
      logger.info({ clientIp }, "Cliente desconectado");
    });
  });
}

startServer();
