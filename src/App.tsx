import { useState, useEffect, lazy, Suspense } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from './lib/utils';

const CanvasInclusivo = lazy(() => import('./components/CanvasInclusivo').then(m => ({ default: m.CanvasInclusivo })));
const VoiceControl = lazy(() => import('./components/VoiceControl').then(m => ({ default: m.VoiceControl })));

interface ProviderInfo {
  name: string;
  displayName: string;
  models: string[];
}

export default function App() {
  const [commands, setCommands] = useState<any[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('gemini');

  useEffect(() => {
    fetch('/api/providers')
      .then(r => r.json())
      .then(setProviders)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socket.onopen = () => setIsConnected(true);
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'AI_ACTION' || message.type === 'ERROR') {
        setCommands((prev) => [...prev, message]);
      }
    };
    socket.onclose = () => setIsConnected(false);
    setWs(socket);
    return () => socket.close();
  }, []);

  const handleSendCommand = (text: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'VOICE_COMMAND', text, provider: selectedProvider }));
    }
  };

  const currentProvider = providers.find(p => p.name === selectedProvider);

  return (
    <div className="flex flex-col h-screen bg-slate-950 font-sans overflow-hidden">
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Voz<span className="text-emerald-400">Art</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-bold shadow-sm">Diseño</button>
            <button className="px-4 py-1.5 text-slate-400 text-sm font-bold hover:text-white transition-colors">Exportar</button>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-500 border-2 border-white flex items-center justify-center text-white font-bold text-sm">JS</div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Cargando lienzo...</div>}>
          <CanvasInclusivo commands={commands} />
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

      <footer className="h-12 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-400" : "bg-red-500 animate-pulse")} /> 
            WebSocket: {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
          <span>IA: {currentProvider?.displayName || selectedProvider}</span>
        </div>
        <div className="hidden md:flex gap-6">
          <span>v1.0</span>
        </div>
      </footer>
    </div>
  );
}
