import express from "express";
import path from "path";
import type { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pino from "pino";
import dotenv from "dotenv";
import { z } from "zod";
import { getProvider, listProviders } from "./server/ai/registry.js";
import type { AIAction } from "./server/ai/types.js";

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
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const APP_ACCESS_TOKEN = process.env.APP_ACCESS_TOKEN || "";
const AI_PROVIDER_TIMEOUT_MS = parseInt(process.env.AI_PROVIDER_TIMEOUT_MS || "15000", 10);
const TRUST_PROXY = process.env.TRUST_PROXY;

const app = express();

if (TRUST_PROXY) {
  app.set("trust proxy", TRUST_PROXY === "true" ? 1 : TRUST_PROXY);
}

const allowedOrigins = process.env.NODE_ENV === "production"
  ? new Set([APP_URL, process.env.CAPACITOR_ORIGIN || "capacitor://localhost"])
  : null;

const VoiceCommandSchema = z.object({
  type: z.literal("VOICE_COMMAND"),
  text: z.string().trim().min(1).max(1000),
  provider: z.string().trim().min(1).max(50).optional(),
  model: z.string().trim().min(1).max(100).optional(),
  context: z.string().max(2000).optional(),
  sessionId: z.string().max(80).optional(),
});

function isAuthorizedToken(token: string | null): boolean {
  return !APP_ACCESS_TOKEN || token === APP_ACCESS_TOKEN;
}

function getBearerToken(header: string | undefined): string | null {
  const prefix = "Bearer ";
  return header?.startsWith(prefix) ? header.slice(prefix.length) : null;
}

function getClientIp(req: IncomingMessage): string {
  if (TRUST_PROXY) {
    const forwardedFor = req.headers["x-forwarded-for"];
    const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    if (firstForwarded) return firstForwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout tras ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https://image.pollinations.ai", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors({
  origin: allowedOrigins
    ? (origin, callback) => callback(null, !origin || allowedOrigins.has(origin))
    : "*",
}));

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

app.get("/api/providers", (req, res) => {
  if (!isAuthorizedToken(getBearerToken(req.headers.authorization))) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  res.json(listProviders().map(p => ({ name: p.name, displayName: p.displayName, models: p.models })));
});

app.get("/api/health", (_req, res) => {
  const providerList = listProviders().map(p => p.name);
  res.json({
    status: "ok",
    uptime: process.uptime(),
    version: "1.4.0",
    serverTime: Date.now(),
    providers: providerList,
    websocket: {
      path: "/ws",
      allowedOrigins: allowedOrigins ? Array.from(allowedOrigins) : "*",
    },
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

  const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });
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

  const rooms = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws: WebSocket, req) => {
    const origin = req.headers.origin || "";
    if (allowedOrigins && origin && !allowedOrigins.has(origin)) {
      logger.warn({ origin }, "Conexión WS rechazada: origin no permitido");
      ws.close(1008, "Origin no permitido");
      return;
    }

    const requestUrl = new URL(req.url || "/", APP_URL);
    if (!isAuthorizedToken(requestUrl.searchParams.get("access_token"))) {
      ws.close(1008, "No autorizado");
      return;
    }

    const aliveWs = ws as AliveWebSocket;
    aliveWs.isAlive = true;
    const clientIp = getClientIp(req);
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
        const parsed = JSON.parse(data.toString());

        if (parsed.type === "JOIN_ROOM") {
          const roomId = String(parsed.roomId || "default");
          if (!rooms.has(roomId)) rooms.set(roomId, new Set());
          rooms.get(roomId)!.add(ws);
          ws.send(JSON.stringify({ type: "ROOM_JOINED", roomId }));
          logger.info({ roomId }, "Cliente unido a sala");
          return;
        }

        if (parsed.type === "LEAVE_ROOM") {
          const roomId = String(parsed.roomId || "default");
          rooms.get(roomId)?.delete(ws);
          return;
        }

        if (parsed.type === "CANVAS_UPDATE") {
          const roomId = String(parsed.roomId || "default");
          const members = rooms.get(roomId);
          if (members) {
            for (const member of members) {
              if (member !== ws && member.readyState === WebSocket.OPEN) {
                member.send(JSON.stringify({ type: "CANVAS_UPDATE", data: parsed.data }));
              }
            }
          }
          return;
        }

        const payload = VoiceCommandSchema.parse(parsed);
        if (payload.type === "VOICE_COMMAND") {
          const preferredName = payload.provider || "gemini";
          const preferredProvider = getProvider(preferredName);
          if (!preferredProvider) {
            ws.send(JSON.stringify({ type: "ERROR", message: "El proveedor seleccionado no está disponible. Intenta con otro en el panel lateral." }));
            return;
          }
          if (payload.model && !preferredProvider.models.includes(payload.model)) {
            ws.send(JSON.stringify({ type: "ERROR", message: "El modelo seleccionado no está disponible para este proveedor. Revisa la configuración." }));
            return;
          }
          const fallbackOrder = [preferredName, ...listProviders().map(p => p.name).filter(n => n !== preferredName)];
          let lastError: unknown;
          let results: AIAction[] | null = null;
          let usedProvider = preferredName;

          for (const name of fallbackOrder) {
            const provider = getProvider(name);
            if (!provider) continue;

            logger.info({ provider: name, textLength: payload.text.length, hasContext: !!payload.context }, "Procesando comando");
            try {
              const r = await withTimeout(
                provider.processCommand(payload.text, {
                  model: name === preferredName ? payload.model : undefined,
                  context: payload.context,
                  sessionId: payload.sessionId,
                }),
                AI_PROVIDER_TIMEOUT_MS,
                name,
              );
              const nonError = r.filter(a => a.action !== "ERROR");
              if (nonError.length > 0) {
                results = r;
                usedProvider = name;
                break;
              }
              lastError = r.find(a => a.action === "ERROR")?.message || "Error desconocido";
            } catch (err) {
              lastError = err;
              logger.warn({ provider: name, err }, "Fallback: provider falló");
              continue;
            }
          }

          if (results) {
            for (const action of results) {
              const msg = usedProvider !== preferredName
                ? { type: "AI_ACTION", data: action, _fallback: true, _provider: usedProvider }
                : { type: "AI_ACTION", data: action };
              ws.send(JSON.stringify(msg));
            }
          } else {
            const msg = `No se pudo procesar tu comando.`;
            const detail = lastError ? ` Error: ${String(lastError)}` : ' Ningún proveedor AI respondió correctamente.';
            ws.send(JSON.stringify({
              type: "ERROR",
              message: msg + detail,
            }));
          }
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
