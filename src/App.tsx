import { useState, useEffect, lazy, Suspense, useCallback, useRef } from 'react';
import { Sparkles, Download } from 'lucide-react';
import { cn } from './lib/utils';

const CanvasInclusivo = lazy(() => import('./components/CanvasInclusivo').then(m => ({ default: m.CanvasInclusivo })));
const VoiceControl = lazy(() => import('./components/VoiceControl').then(m => ({ default: m.VoiceControl })));

interface ProviderInfo {
  name: string;
  displayName: string;
  models: string[];
}

type ServerMode = "connecting" | "connected" | "local";

export default function App() {
  const [commands, setCommands] = useState<any[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [mode, setMode] = useState<ServerMode>("connecting");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const canvasApiRef = useRef<{ exportPNG: () => void } | null>(null);
  const reconnectRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  const connectWS = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onopen = () => {
      setMode("connected");
      reconnectRef.current = 0;
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'AI_ACTION' || message.type === 'ERROR') {
          setCommands((prev) => [...prev, message]);
        }
      } catch {}
    };

    socket.onclose = () => {
      setMode("local");
      wsRef.current = null;
      const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 30000);
      reconnectRef.current++;
      setTimeout(connectWS, delay);
    };

    socket.onerror = () => socket.close();
    wsRef.current = socket;
    setWs(socket);
  }, []);

  useEffect(() => {
    fetch('/api/providers')
      .then(r => r.json())
      .then((data) => {
        setProviders(data);
        connectWS();
      })
      .catch(() => {
        setMode("local");
      });
  }, [connectWS]);

  const handleSendCommand = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'VOICE_COMMAND', text, provider: selectedProvider }));
    } else {
      setCommands((prev) => [...prev, { type: 'ERROR', data: { action: 'ERROR', message: 'Sin conexión al servidor. Modo local.' } }]);
    }
  }, [selectedProvider]);

  const currentProvider = providers.find(p => p.name === selectedProvider);

  return (
    <div className="flex flex-col h-screen bg-slate-950 font-sans overflow-hidden select-none">
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <Sparkles size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight hidden sm:block">
            Voz<span className="text-emerald-400">Art</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => canvasApiRef.current?.exportPNG()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Cargando lienzo...</div>}>
          <CanvasInclusivo commands={commands} canvasApiRef={canvasApiRef} />
        </Suspense>

        <Suspense fallback={<div className="w-72 bg-slate-900 border-l border-slate-800 flex items-center justify-center text-slate-600 text-sm">Cargando...</div>}>
          <VoiceControl
            onSendCommand={handleSendCommand}
            commands={commands}
            providers={providers}
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
          />
        </Suspense>
      </main>

      <footer className="h-10 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", mode === "connected" ? "bg-emerald-400" : mode === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-slate-600")} />
            {mode === "connected" ? "Conectado" : mode === "connecting" ? "Conectando..." : "Local"}
          </span>
          {mode === "connected" && (
            <span className="text-slate-600">{currentProvider?.displayName || selectedProvider}</span>
          )}
        </div>
        <span className="text-slate-600">v1.0</span>
      </footer>
    </div>
  );
}
