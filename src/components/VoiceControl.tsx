import { useState, useEffect, useRef } from 'react';
import { AlertCircle, Mic, MicOff, Send, MessageSquare, Layers, Eye, EyeOff, Cpu, X, Plus, Trash2, Lock, Unlock, ArrowUp, ArrowDown, FolderOpen, Share2, Upload, Save, Sparkles, List } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import type { AccessibilitySettings, AppCommand, Layer, ProjectSnapshot, WorkProfile } from '../types';

interface ProviderInfo {
  name: string;
  displayName: string;
  models: string[];
}

interface VoiceControlProps {
  onSendCommand: (text: string) => void;
  commands: AppCommand[];
  providers: ProviderInfo[];
  selectedProvider: string;
  onProviderChange: (name: string) => void;
  isProcessing?: boolean;
  layers: Layer[];
  activeLayerId: string;
  onAddLayer: () => void;
  onRemoveLayer: (id: string) => void;
  onToggleLayer: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onToggleLockLayer: (id: string) => void;
  onLayerOpacity: (id: string, value: number) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onSelectLayer: (id: string) => void;
  accessibility: AccessibilitySettings;
  onAccessibilityChange: (key: keyof AccessibilitySettings, value: boolean) => void;
  workProfile: WorkProfile;
  onWorkProfileChange: (profile: WorkProfile) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  collaboratorName: string;
  onCollaboratorNameChange: (name: string) => void;
  projects: ProjectSnapshot[];
  currentProjectId: string | null;
  autosaveStatus: string;
  onNewProject: () => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
  onCopyShareUrl: () => void;
  onClose?: () => void;
  onInspiration: () => void;
  onRefineSelection: () => void;
  canvasObjects: string[];
  handTrackingActive: boolean;
  onToggleHandTracking: () => void;
  roomId: string | null;
  collaborators: number;
  onJoinRoom: () => void;
  onLeaveRoom: () => void;
  eyeTrackingActive: boolean;
  onToggleEyeTracking: () => void;
  storyMode: boolean;
  onStoryCommand: (text: string) => void;
  onExitStoryMode: () => void;
  autoMode: boolean;
  onToggleAutoMode: () => void;
  pendingActions: AppCommand[];
  onConfirmAction: (index: number) => void;
  onRejectAction: (index: number) => void;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ onSendCommand, commands, providers, selectedProvider, onProviderChange, isProcessing, layers, activeLayerId, onAddLayer, onRemoveLayer, onToggleLayer, onRenameLayer, onToggleLockLayer, onLayerOpacity, onMoveLayer, onSelectLayer, accessibility, onAccessibilityChange, workProfile, onWorkProfileChange, projectName, onProjectNameChange, collaboratorName, onCollaboratorNameChange, projects, currentProjectId, autosaveStatus, onNewProject, onOpenProject, onDeleteProject, onExportProject, onImportProject, onCopyShareUrl, onClose, onInspiration, onRefineSelection, canvasObjects, handTrackingActive, onToggleHandTracking, roomId, collaborators, onJoinRoom, onLeaveRoom, eyeTrackingActive, onToggleEyeTracking, storyMode, onStoryCommand, onExitStoryMode, autoMode, onToggleAutoMode, pendingActions, onConfirmAction, onRejectAction }) => {
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [speechUnsupported, setSpeechUnsupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef('');
  const onSendCommandRef = useRef(onSendCommand);
  useEffect(() => { onSendCommandRef.current = onSendCommand; }, [onSendCommand]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechUnsupported(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      transcriptRef.current = event.results[current][0].transcript;
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcriptRef.current) {
        onSendCommandRef.current(transcriptRef.current);
        transcriptRef.current = '';
      }
    };

    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  const toggleListening = () => {
    const r = recognitionRef.current;
    if (!r) return;
    if (isListening) {
      r.stop();
    } else {
      transcriptRef.current = '';
      r.start();
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

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImportProject(file);
    e.target.value = '';
  };

  const history = commands.slice(-10).reverse();
  const profiles: { value: WorkProfile; label: string }[] = [
    { value: 'artist', label: 'Artista' },
    { value: 'education', label: 'Educación' },
    { value: 'architecture', label: 'Arquitectura' },
    { value: 'medical', label: 'Médico' },
    { value: 'legal', label: 'Legal' },
    { value: 'diagram', label: 'Diagramas' },
  ];

  return (
    <aside className={cn("w-72 md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col p-4 md:p-6 shrink-0 h-full overflow-y-auto transition-transform", accessibility.easyRead && "scale-110 origin-top-right")}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Control Voz IA</h3>
        {onClose && (
          <button onClick={onClose} className="md:hidden w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors" aria-label="Cerrar">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="mb-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Perfil de uso</span>
        </div>
        <select
          value={workProfile}
          onChange={(e) => onWorkProfileChange(e.target.value as WorkProfile)}
          className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 outline-none focus:border-blue-500/50"
          aria-label="Perfil de uso"
        >
          {profiles.map(profile => <option key={profile.value} value={profile.value}>{profile.label}</option>)}
        </select>
      </div>

      <div className="mb-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen size={12} className="text-slate-500" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Proyecto</span>
          <span className="ml-auto text-[9px] text-emerald-400 font-bold" title={autosaveStatus === 'Guardado' ? 'Proyecto guardado en el navegador' : autosaveStatus === 'Guardando...' ? 'Guardando cambios...' : 'Esperando cambios...'}>{autosaveStatus}</span>
        </div>
        <div className="space-y-2">
          <input
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="Nombre del proyecto"
            className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 outline-none focus:border-blue-500/50"
            aria-label="Nombre del proyecto"
          />
          <input
            value={collaboratorName}
            onChange={(e) => onCollaboratorNameChange(e.target.value)}
            placeholder="Tu nombre"
            className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 outline-none focus:border-blue-500/50"
            aria-label="Identidad compartida"
          />
          <select
            value={currentProjectId ?? ''}
            onChange={(e) => e.target.value && onOpenProject(e.target.value)}
            className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 outline-none focus:border-blue-500/50"
            aria-label="Abrir proyecto"
          >
            <option value="">Proyecto actual</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
        </select>
        <button onClick={onInspiration} className="mt-2 w-full rounded-xl bg-purple-500/10 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-purple-300 hover:bg-purple-500 hover:text-white transition-colors flex items-center justify-center gap-1">
          <Sparkles size={11} /> Inspiración
        </button>
        <button onClick={onRefineSelection} className="mt-1.5 w-full rounded-xl bg-amber-500/10 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-amber-300 hover:bg-amber-500 hover:text-white transition-colors flex items-center justify-center gap-1">
          <Send size={11} /> Refinar selección
        </button>
        <button onClick={onToggleHandTracking} className={cn('mt-1.5 w-full rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors', handTrackingActive ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>
          <Eye size={11} /> {handTrackingActive ? 'Manos activo' : 'Activar manos'}
        </button>
        <button onClick={onToggleEyeTracking} className={cn('mt-1.5 w-full rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors', eyeTrackingActive ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>
          <Eye size={11} /> {eyeTrackingActive ? 'Ojos activo' : 'Activar ojos'}
        </button>
        <button onClick={onToggleAutoMode} className={cn('mt-1.5 w-full rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors', autoMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-amber-600 text-white')}>
          <Cpu size={11} /> {autoMode ? 'Auto' : 'Manual'}
        </button>
        <button onClick={() => onStoryCommand(inputText || 'cuenta una historia visual')} className={cn('mt-1.5 w-full rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors', storyMode ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>
          <List size={11} /> {storyMode ? 'Historia activa' : 'Modo Historia'}
        </button>
        {storyMode && (
          <button onClick={onExitStoryMode} className="mt-1 w-full rounded-xl bg-slate-800 px-2 py-2 text-[10px] font-black text-slate-300 hover:bg-slate-700">
            Salir de historia
          </button>
        )}
      </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider">
          <button onClick={onNewProject} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">Nuevo</button>
          <button onClick={onExportProject} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700 flex items-center justify-center gap-1"><Save size={11} />Exportar</button>
          <button onClick={() => projectInputRef.current?.click()} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700 flex items-center justify-center gap-1"><Upload size={11} />Importar</button>
          <button onClick={onCopyShareUrl} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700 flex items-center justify-center gap-1"><Share2 size={11} />Compartir</button>
        </div>
        {currentProjectId && (
          <button onClick={() => onDeleteProject(currentProjectId)} className="mt-2 w-full rounded-xl bg-red-500/10 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-red-300 hover:bg-red-500 hover:text-white">Eliminar proyecto actual</button>
        )}
        <input ref={projectInputRef} type="file" accept=".json,.vozart.json" className="hidden" onChange={handleImportFile} />
      </div>

      <div className="mb-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
        <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
          <Share2 size={11} /> Colaboración
        </h3>
        {roomId ? (
          <div className="space-y-2">
            <p className="text-[9px] text-slate-400">Sala: <span className="font-mono text-emerald-400">{roomId}</span></p>
            {collaborators > 0 && <p className="text-[9px] text-slate-400">{collaborators} colaborador(es) conectado(s)</p>}
            <button onClick={onLeaveRoom} className="w-full rounded-xl bg-red-500/10 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-red-300 hover:bg-red-500 hover:text-white transition-colors">
              Salir de sala
            </button>
          </div>
        ) : (
          <button onClick={onJoinRoom} className="w-full rounded-xl bg-slate-800 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-slate-700 transition-colors">
            Crear sala compartida
          </button>
        )}
      </div>

      <div className="mb-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
        <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-3">Accesibilidad</h3>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider">
          {([
            ['highContrast', 'Contraste'],
            ['easyRead', 'Lectura'],
            ['largeUi', 'UI grande'],
            ['reduceMotion', 'Sin motion'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onAccessibilityChange(key, !accessibility[key])}
              className={cn('rounded-xl px-2 py-2 transition-colors', accessibility[key] ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}
              aria-pressed={accessibility[key]}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

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
        {isProcessing && (
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">
            Procesando...
          </p>
        )}
        {speechUnsupported && (
          <p className="text-[9px] text-slate-600 text-center px-2">Speech API no disponible en este navegador</p>
        )}
      </div>

      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Historial</h3>
      <div className="flex flex-col gap-3 flex-1">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {history.length > 0 && `Último comando: "${history[0].type === 'ERROR' ? 'Error' : 'Ejecutado'}: ${history[0].type === 'ERROR' ? (history[0].data?.message || history[0].message) : (history[0].data.prompt || history[0].data.action)}"`}
        </div>
        <AnimatePresence initial={false}>
          {history.length > 0 ? (
            history.map((cmd, i) => {
              const isError = cmd.type === 'ERROR';
              const message = isError
                ? cmd.data?.message || cmd.message || 'No se pudo procesar el comando'
                : cmd.data.prompt || cmd.data.action || 'Comando procesado';
              const time = cmd.timestamp
                ? new Date(cmd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Ahora';

              return (
              <motion.div
                key={`${cmd.type}-${cmd.timestamp ?? i}-${i}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "p-3 bg-slate-950 rounded-xl border-l-4 shadow-sm",
                  isError ? "border-red-500" : "border-blue-500"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-wider",
                    isError ? "text-red-400" : "text-blue-400"
                  )}>
                    {isError ? 'Error' : 'Ejecutado'}
                  </span>
                  <span className="text-[9px] text-slate-600 font-mono">{time}</span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2 flex gap-1.5">
                  {isError && <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />}
                  <span>"{message}"</span>
                </p>
              </motion.div>
              );
            })
          ) : (
            <p className="text-xs text-slate-600 italic">No hay historial todavía...</p>
          )}
        </AnimatePresence>
      </div>

      {canvasObjects.length > 0 && (
        <div className="mb-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
          <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <List size={11} /> Objetos ({canvasObjects.length})
          </h3>
          <ul className="space-y-1 max-h-32 overflow-y-auto" aria-label="Lista de objetos en el lienzo" role="list">
            {canvasObjects.map((obj, idx) => {
              const [type, , layer] = obj.split('|');
              return (
                <li key={idx} tabIndex={0} role="listitem" className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800/40 text-[10px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400">
                  <span className="font-mono text-slate-500">#{idx + 1}</span>
                  <span className="font-bold text-slate-200">{type}</span>
                  <span className="text-slate-600 ml-auto truncate">{layer}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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

      {!autoMode && pendingActions.length > 0 && (
        <div className="mb-3 space-y-2">
          <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Acciones pendientes</p>
          {pendingActions.map((action, i) => (
            <div key={i} className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2">
              <p className="text-[10px] text-amber-200 mb-1 truncate">
                {action.data?.action || 'AI Action'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => onConfirmAction(i)} className="flex-1 rounded-lg bg-emerald-600 px-2 py-1 text-[9px] font-black text-white hover:bg-emerald-500">Confirmar</button>
                <button onClick={() => onRejectAction(i)} className="flex-1 rounded-lg bg-red-600 px-2 py-1 text-[9px] font-black text-white hover:bg-red-500">Descartar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Capas</h3>
          <div className="flex items-center gap-1">
            <button onClick={onAddLayer} className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors" aria-label="Agregar capa">
              <Plus size={12} />
            </button>
            <Layers size={14} className="text-slate-600" />
          </div>
        </div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {layers.map((layer, idx) => (
            <div
              key={layer.id}
              tabIndex={0}
              role="button"
              onClick={() => onSelectLayer(layer.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectLayer(layer.id); } }}
              className={cn(
                "flex flex-col gap-1 p-2 rounded-xl border cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-400",
                activeLayerId === layer.id
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-slate-800/50 border-slate-800 hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0",
                  activeLayerId === layer.id ? "bg-blue-500" : "bg-slate-600"
                )}>
                  {idx + 1}
                </div>
                <input
                  value={layer.name}
                  onChange={(e) => onRenameLayer(layer.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent text-xs text-slate-200 outline-none border-none truncate"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleLockLayer(layer.id); }}
                  className={cn("transition-colors", layer.locked ? "text-amber-400" : "text-slate-600 hover:text-slate-300")}
                  aria-label={layer.locked ? 'Desbloquear capa' : 'Bloquear capa'}
                >
                  {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleLayer(layer.id); }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={layer.visible ? 'Ocultar capa' : 'Mostrar capa'}
                >
                  {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                {layers.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                    aria-label="Eliminar capa"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 pl-7">
                <button onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'up'); }} disabled={idx === layers.length - 1} className="text-slate-500 hover:text-slate-300 disabled:opacity-30" aria-label="Subir capa">
                  <ArrowUp size={11} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'down'); }} disabled={idx === 0} className="text-slate-500 hover:text-slate-300 disabled:opacity-30" aria-label="Bajar capa">
                  <ArrowDown size={11} />
                </button>
              <span className="text-[9px] text-slate-400 w-6">Op:</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={layer.opacity ?? 1}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onLayerOpacity(layer.id, Number(e.target.value))}
                  className="flex-1"
                  aria-label="Opacidad capa"
                />
                <span className="text-[9px] text-slate-400 w-8 text-right">{Math.round((layer.opacity ?? 1) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
