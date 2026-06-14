import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, MessageSquare, Layers, Eye, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ProviderInfo {
  name: string;
  displayName: string;
  models: string[];
}

interface VoiceControlProps {
  onSendCommand: (text: string) => void;
  commands: any[];
  providers: ProviderInfo[];
  selectedProvider: string;
  onProviderChange: (name: string) => void;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ onSendCommand, commands, providers, selectedProvider, onProviderChange }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [speechUnsupported, setSpeechUnsupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechUnsupported(true);
      return;
    }
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'es-ES';

    recognitionRef.current.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      if (transcript) {
        onSendCommand(transcript);
        setTranscript('');
      }
    };

    recognitionRef.current.onerror = () => setIsListening(false);

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [transcript, onSendCommand]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleManualSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendCommand(inputText);
      setInputText('');
    }
  };

  // Filtrar solo los comandos de voz enviados por el usuario para el historial
  // (En este caso usaremos los mensajes 'AI_ACTION' para mostrar qué se procesó)
  const history = commands.filter(c => c.type === 'AI_ACTION').slice(-3).reverse();

  return (
    <aside className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col p-6 shrink-0 h-full overflow-y-auto">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Control Voz IA</h3>

      {/* Selector de Proveedor */}
      <div className="mb-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={12} className="text-slate-500" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Proveedor IA</span>
        </div>
        <select
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 outline-none focus:border-blue-500/50"
        >
          {providers.map(p => (
            <option key={p.name} value={p.name}>{p.displayName}</option>
          ))}
        </select>
      </div>
      
        {/* Botón de Micrófono Principal */}
      <div className="flex flex-col items-center gap-4 py-6 bg-slate-950/50 rounded-2xl border border-slate-800 mb-6">
        {speechUnsupported ? (
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center opacity-50">
            <Mic size={24} className="text-slate-500" />
          </div>
        ) : (
          <button
            onClick={toggleListening}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 relative",
              isListening ? "bg-red-500 shadow-lg shadow-red-500/40 animate-pulse" : "bg-slate-800 hover:bg-slate-700"
            )}
          >
            {isListening ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
            {isListening && (
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute inset-0 rounded-full bg-red-500 -z-10"
              />
            )}
          </button>
        )}
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {speechUnsupported ? 'No compatible' : isListening ? 'Escuchando...' : 'Presiona para hablar'}
        </p>
        {speechUnsupported && (
          <p className="text-[9px] text-slate-600 text-center px-2">Speech API no disponible en este navegador</p>
        )}
      </div>

      {/* Historial de Comandos */}
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Historial</h3>
      <div className="flex flex-col gap-3 flex-1">
        <AnimatePresence initial={false}>
          {history.length > 0 ? (
            history.map((cmd, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-slate-950 rounded-xl border-l-4 border-blue-500 shadow-sm"
              >
                <p className="text-xs text-slate-300 line-clamp-2">
                  "{cmd.data.prompt || cmd.data.action || 'Comando procesado'}"
                </p>
                <span className="text-[9px] text-slate-500 mt-1 block italic font-medium">Recién ejecutado</span>
              </motion.div>
            ))
          ) : (
            <p className="text-xs text-slate-600 italic">No hay historial todavía...</p>
          )}
        </AnimatePresence>
      </div>

      {/* Entrada Manual */}
      <form onSubmit={handleManualSend} className="relative my-6">
        <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 focus-within:border-blue-500/50 transition-all">
          <MessageSquare size={14} className="ml-2 text-slate-600" />
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Comando manual..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-xs py-1.5 px-1 placeholder:text-slate-700 outline-none"
          />
          <button
            type="submit"
            className="p-1.5 bg-blue-600 text-white rounded-lg hover:scale-105 transition-transform"
          >
            <Send size={12} />
          </button>
        </div>
      </form>

      {/* Gestión de Capas */}
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Capas</h3>
           <Layers size={14} className="text-slate-600" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/30">
            <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">L1</div>
            <span className="text-xs text-white font-medium">Pincel Óptico</span>
            <Eye className="ml-auto text-blue-400" size={14} />
          </div>
          <div className="flex items-center gap-3 p-2.5 bg-slate-800/50 rounded-xl border border-slate-800">
            <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white font-mono">IA</div>
            <span className="text-xs text-slate-300 font-medium tracking-tight">Capa Base IA</span>
            <Eye className="ml-auto text-slate-600" size={14} />
          </div>
        </div>
      </div>
    </aside>
  );
};
