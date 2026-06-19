import { useState, useEffect, lazy, Suspense, useCallback, useRef } from 'react';
import { Sparkles, Download, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from './lib/utils';
import type { AppCommand } from './types';

const CanvasInclusivo = lazy(() => import('./components/CanvasInclusivo').then(m => ({ default: m.CanvasInclusivo })));
const VoiceControl = lazy(() => import('./components/VoiceControl').then(m => ({ default: m.VoiceControl })));

interface ProviderInfo {
  name: string;
  displayName: string;
  models: string[];
}

type ServerMode = "connecting" | "connected" | "local";

const MAX_COMMANDS = 50;
const MAX_RECONNECTS = 6;

export default function App() {
  const [commands, setCommands] = useState<AppCommand[]>([]);
  const [mode, setMode] = useState<ServerMode>("connecting");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const canvasApiRef = useRef<{ exportPNG: () => void } | null>(null);
  const reconnectRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);

  const addCommand = useCallback((cmd: AppCommand) => {
    setCommands(prev => [...prev.slice(-(MAX_COMMANDS - 1)), cmd]);
  }, []);

  const connectWS = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onopen = () => {
      setMode("connected");
      reconnectRef.current = 0;
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as AppCommand;
        if (message.type === 'AI_ACTION' || message.type === 'ERROR') {
          addCommand(message);
        }
      } catch {}
    };

    socket.onclose = () => {
      setMode("local");
      wsRef.current = null;
      if (!shouldReconnectRef.current) return;
      if (reconnectRef.current >= MAX_RECONNECTS) return;
      const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 30000);
      reconnectRef.current++;
      reconnectTimeoutRef.current = window.setTimeout(connectWS, delay);
    };

    socket.onerror = () => socket.close();
    wsRef.current = socket;
  }, [addCommand]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    fetch('/api/providers')
      .then(r => r.json())
      .then((data) => {
        setProviders(data);
        connectWS();
      })
      .catch(() => {
        setMode("local");
      });

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connectWS]);

  const handleSendCommand = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'VOICE_COMMAND', text, provider: selectedProvider }));
    } else {
      addCommand({ type: 'ERROR', data: { action: 'ERROR', message: 'Sin conexión al servidor. Modo local.' } });
    }
  }, [selectedProvider, addCommand]);

  const currentProvider = providers.find(p => p.name === selectedProvider);

  return (
    <div className="flex flex-col h-dvh bg-slate-950 font-sans overflow-hidden select-none">
      <header className="h-14 md:h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 md:px-4 shrink-0 z-50">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <Sparkles size={16} className="text-white md:w-5 md:h-5" />
          </div>
          <h1 className="text-lg md:text-xl font-black text-white tracking-tight">
            Voz<span className="text-emerald-400">Art</span>
          </h1>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={() => canvasApiRef.current?.exportPNG()}
            className="flex items-center gap-1 px-2 py-1.5 md:px-3 md:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
          >
            <Download size={14} />
            <span className="hidden md:inline">Exportar</span>
          </button>
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className="md:hidden flex items-center justify-center w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Cargando lienzo...</div>}>
          <CanvasInclusivo commands={commands} canvasApiRef={canvasApiRef} />
        </Suspense>

        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className={cn(
          "fixed md:relative right-0 top-0 h-full z-50 md:z-auto",
          "translate-x-full md:translate-x-0",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen && "translate-x-0"
        )}>
          <Suspense fallback={<div className="w-72 md:w-80 bg-slate-900 border-l border-slate-800 flex items-center justify-center text-slate-600 text-sm h-full">Cargando...</div>}>
            <VoiceControl
              onSendCommand={handleSendCommand}
              commands={commands}
              providers={providers}
              selectedProvider={selectedProvider}
              onProviderChange={setSelectedProvider}
              onClose={() => setSidebarOpen(false)}
            />
          </Suspense>
        </div>
      </main>

      <footer className="h-8 md:h-10 bg-slate-900 border-t border-slate-800 px-3 md:px-4 flex items-center justify-between text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <span className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", mode === "connected" ? "bg-emerald-400" : mode === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-slate-600")} />
            {mode === "connected" ? "Conectado" : mode === "connecting" ? "Conectando..." : "Local"}
          </span>
          {mode === "connected" && (
            <span className="text-slate-600 hidden sm:inline">{currentProvider?.displayName || selectedProvider}</span>
          )}
        </div>
        <span className="text-slate-600">v1.2</span>
      </footer>
    </div>
  );
}
