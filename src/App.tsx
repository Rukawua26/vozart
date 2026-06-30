import { useState, useEffect, lazy, Suspense, useCallback, useRef } from 'react';
import { Sparkles, Download, PanelRightClose, PanelRightOpen, Activity } from 'lucide-react';
import { cn } from './lib/utils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { contextManager } from './services/AIContextManager';
import { streamManager } from './services/AIStreamManager';
import { getProfilePreset } from './services/profilePresets';
import type { AccessibilitySettings, AppCommand, Layer, ProjectSnapshot, WorkProfile } from './types';
import { createProjectId, makeLayersForProfile, downloadJSON, parseStoredProjects, PROJECTS_STORAGE_KEY } from './lib/project';

const CanvasInclusivo = lazy(() => import('./components/CanvasInclusivo').then(m => ({ default: m.CanvasInclusivo })));
const VoiceControl = lazy(() => import('./components/VoiceControl').then(m => ({ default: m.VoiceControl })));
const HandTracking = lazy(() => import('./components/HandTracking').then(m => ({ default: m.HandTracking })));
const EyeTracking = lazy(() => import('./components/EyeTracking').then(m => ({ default: m.EyeTracking })));

interface ProviderInfo {
  name: string;
  displayName: string;
  models: string[];
}

type ServerMode = "connecting" | "connected" | "local";

const MAX_COMMANDS = 50;
const MAX_RECONNECTS = 6;
const ACTIVE_PROJECT_STORAGE_KEY = 'vozart-active-project';
const COLLABORATOR_STORAGE_KEY = 'vozart-collaborator-name';
const APP_ACCESS_TOKEN = (import.meta as any).env?.VITE_APP_ACCESS_TOKEN || '';
const SERVER_URL = ((import.meta as any).env?.VITE_SERVER_URL || '').replace(/\/$/, '');
const IS_CAPACITOR = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  highContrast: false,
  easyRead: false,
  largeUi: false,
  reduceMotion: false,
};

export default function App() {
  const [commands, setCommands] = useState<AppCommand[]>([]);
  const [mode, setMode] = useState<ServerMode>("connecting");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY);
  const [workProfile, setWorkProfile] = useState<WorkProfile>('artist');
  const [serverHealth, setServerHealth] = useState<{ ok: boolean; version?: string; providerCount?: number }>({ ok: false });
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-ia', name: 'Capa Base IA', visible: true, locked: false, opacity: 1 },
  ]);
  const [activeLayerId, setActiveLayerId] = useState('layer-ia');
  const [projects, setProjects] = useState<ProjectSnapshot[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('Proyecto VozArt');
  const [collaboratorName, setCollaboratorName] = useState('Invitado');
  const [currentCanvasJson, setCurrentCanvasJson] = useState<string | null>(null);
  const [initialCanvasJson, setInitialCanvasJson] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'Pendiente' | 'Guardando...' | 'Guardado'>('Pendiente');
  const canvasApiRef = useRef<{ exportPNG: () => void; reassignObjectLayer: (objectId: string, toLayerId: string) => void; loadJSON: (json?: string | null) => void; getObjectList: () => string[]; getSelectedObjectInfo: () => string } | null>(null);
  const reconnectRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  const activeLayerIdRef = useRef<string>(activeLayerId);
  activeLayerIdRef.current = activeLayerId;
  const healthIntervalRef = useRef<number | null>(null);
  const ctxRef = useRef(contextManager.getCurrentContext());
  const autosaveTimeoutRef = useRef<number | null>(null);

  const addCommand = useCallback((cmd: AppCommand) => {
    setCommands(prev => [...prev.slice(-(MAX_COMMANDS - 1)), { ...cmd, timestamp: cmd.timestamp ?? new Date().toISOString() }]);
  }, []);

  const processingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const storedProjects = parseStoredProjects();
    setProjects(storedProjects);

    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get('project');
    const userParam = params.get('user');
    const activeProjectId = projectParam || localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
    if (userParam) {
      setCollaboratorName(userParam);
      localStorage.setItem(COLLABORATOR_STORAGE_KEY, userParam);
    } else {
      const storedName = localStorage.getItem(COLLABORATOR_STORAGE_KEY);
      if (storedName) setCollaboratorName(storedName);
    }

    const activeProject = storedProjects.find(project => project.id === activeProjectId);
    if (activeProject) {
      setCurrentProjectId(activeProject.id);
      setProjectName(activeProject.name);
      setWorkProfile(activeProject.workProfile);
      setLayers(activeProject.layers);
      setActiveLayerId(activeProject.layers[0]?.id || 'layer-ia');
      setInitialCanvasJson(activeProject.canvasJson);
      if (!userParam && activeProject.collaboratorName) setCollaboratorName(activeProject.collaboratorName);
    }
  }, []);
  useEffect(() => {
    if (isProcessing) {
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = window.setTimeout(() => setIsProcessing(false), 20000);
    }
    return () => {
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    };
  }, [isProcessing]);

  const connectWS = useCallback(() => {
    if (IS_CAPACITOR && !SERVER_URL) {
      setMode("local");
      addCommand({ type: 'ERROR', data: { action: 'ERROR', message: 'La app Android necesita VITE_SERVER_URL apuntando al servidor VozArt.' } });
      return;
    }
    const baseUrl = SERVER_URL ? new URL(SERVER_URL) : null;
    const protocol = baseUrl ? (baseUrl.protocol === 'https:' ? 'wss:' : 'ws:') : (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
    const host = baseUrl ? baseUrl.host : window.location.host;
    const tokenQuery = APP_ACCESS_TOKEN ? `?access_token=${encodeURIComponent(APP_ACCESS_TOKEN)}` : '';
    const socket = new WebSocket(`${protocol}//${host}${tokenQuery}`);

    socket.onopen = () => {
      setMode("connected");
      reconnectRef.current = 0;
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'AI_ACTION' || message.type === 'ERROR') {
          setIsProcessing(false);
          if (message.type === 'AI_ACTION') {
            streamManager.enqueue(message.data);
            contextManager.addCommand(message, message.data);
           if (!autoModeRef.current) {
              setPendingActions(prev => [...prev, message]);
              return;
            }
          } else {
            contextManager.addCommand(message);
          }
          addCommand(message);
        }
        if (message.type === 'ROOM_JOINED') {
          setRoomId(message.roomId);
          addCommand({ type: 'ERROR', data: { action: 'INFO', message: `Conectado a sala: ${message.roomId}` } });
        }
        if (message.type === 'CANVAS_UPDATE') {
          remoteCanvasRef.current = message.data?.canvasJson ?? null;
          if (remoteCanvasRef.current) {
            canvasApiRef.current?.loadJSON(remoteCanvasRef.current);
          }
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
    const providersUrl = SERVER_URL ? `${SERVER_URL}/api/providers` : '/api/providers';
    const healthUrl = SERVER_URL ? `${SERVER_URL}/api/health` : '/api/health';
    const headers: HeadersInit | undefined = APP_ACCESS_TOKEN ? { Authorization: `Bearer ${APP_ACCESS_TOKEN}` } : undefined;
    if (IS_CAPACITOR && !SERVER_URL) {
      setMode("local");
      addCommand({ type: 'ERROR', data: { action: 'ERROR', message: 'Configura VITE_SERVER_URL para conectar el APK con el servidor VozArt.' } });
      return;
    }
    Promise.all([
      fetch(providersUrl, headers).then(r => r.ok ? r.json() : Promise.reject(new Error('providers http ' + r.status))),
      fetch(healthUrl, headers).then(r => r.ok ? r.json() : Promise.reject(new Error('health http ' + r.status))),
    ]).then(([provData, healthData]) => {
      setProviders(provData);
      contextManager.startSession(activeLayerIdRef.current);
      const welcome = `Servidor OK v${healthData.version}. ${healthData.providers?.length ?? 0} proveedores activos.`;
      addCommand({ type: 'ERROR', data: { action: 'ERROR', message: welcome } });
      connectWS();
      if (healthIntervalRef.current) window.clearInterval(healthIntervalRef.current);
      healthIntervalRef.current = window.setInterval(() => {
        const url = SERVER_URL ? `${SERVER_URL}/api/health` : '/api/health';
        fetch(url).then(r => r.ok ? r.json() : null).then(h => {
          if (!h) return;
          setServerHealth({ ok: true, version: h.version, providerCount: h.providers?.length ?? 0 });
        }).catch(() => setServerHealth(prev => ({ ...prev, ok: false })));
      }, 30000);
    }).catch(() => {
      setMode("local");
      const hint = SERVER_URL ? `No se pudo alcanzar ${SERVER_URL}.` : 'Servidor local no disponible.';
      addCommand({ type: 'ERROR', data: { action: 'ERROR', message: `${hint} Verifica que npm run dev este corriendo.` } });
    });

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
      if (healthIntervalRef.current) window.clearInterval(healthIntervalRef.current);
      wsRef.current?.close();
    };
  }, [addCommand, connectWS]);

  const handleSendCommand = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsProcessing(true);
      ctxRef.current = contextManager.getCurrentContext();
      const sessionId = ctxRef.current?.sessionId;
      const ctxHint = contextManager.buildProviderHint();
      const preset = getProfilePreset(workProfile);
      const profileContext = preset ? `[Perfil: ${preset.label}] ${preset.aiHint}` : '';
      const combinedContext = ctxHint ? `${ctxHint} | ${profileContext}` : profileContext;
      wsRef.current.send(JSON.stringify({
        type: 'VOICE_COMMAND',
        text,
        provider: selectedProvider,
        sessionId,
        context: combinedContext || undefined,
      }));
      if (ctxRef.current) {
        contextManager.addCommand({ type: 'AI_ACTION', data: { action: 'COMMAND', prompt: text }, timestamp: new Date().toISOString() });
      }
    } else {
      const hint = SERVER_URL ? `Revisa que ${SERVER_URL} este encendido y accesible desde el telefono.` : 'Configura VITE_SERVER_URL para Android.';
      addCommand({ type: 'ERROR', data: { action: 'ERROR', message: `No hay conexion con el servidor. ${hint}` } });
    }
  }, [selectedProvider, addCommand, workProfile]);

  const handleInspiration = useCallback(() => {
    const preset = getProfilePreset(workProfile);
    const msg = preset
      ? `Inspírame: dame 3 ideas creativas para dibujar según mi perfil (${preset.label}). Describe cada idea brevemente con colores y composición sugeridos.`
      : 'Inspírame: dame 3 ideas creativas para dibujar. Describe cada idea brevemente.';
    handleSendCommand(msg);
  }, [handleSendCommand, workProfile]);

  const handleRefineSelection = useCallback(() => {
    const info = canvasApiRef.current?.getSelectedObjectInfo();
    if (!info) {
      addCommand({ type: 'ERROR', data: { action: 'ERROR', message: 'Selecciona un objeto en el canvas para refinarlo.' } });
      return;
    }
    handleSendCommand(`Refina este objeto: ${info}. Ajusta su color, opacidad, tamaño y posición para que armonice mejor con el resto del canvas.`);
  }, [handleSendCommand, addCommand]);

  const [storyMode, setStoryMode] = useState(false);
  const [storyScenes, setStoryScenes] = useState<{ description: string; actions: string[] }[]>([]);

  const handleStoryCommand = useCallback((narrative: string) => {
    setStoryMode(true);
    handleSendCommand(`MODO HISTORIA activado. Narración del usuario: "${narrative}". Genera una secuencia de escenas visuales (STORY_SCENE) que representen esta historia. Describe cada escena visualmente e incluye las acciones necesarias para crearla en el canvas.`);
  }, [handleSendCommand]);

  const [canvasObjects, setCanvasObjects] = useState<string[]>([]);
  const [handTrackingActive, setHandTrackingActive] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState(0);
  const remoteCanvasRef = useRef<string | null>(null);
  const [eyeTrackingActive, setEyeTrackingActive] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const autoModeRef = useRef(true);
  autoModeRef.current = autoMode;
  const [pendingActions, setPendingActions] = useState<AppCommand[]>([]);

  const handleConfirmAction = useCallback((index: number) => {
    setPendingActions(prev => {
      const action = prev[index];
      if (action) addCommand(action);
      return prev.filter((_, i) => i !== index);
    });
  }, [addCommand]);

  const handleRejectAction = useCallback((index: number) => {
    setPendingActions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleJoinRoom = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addCommand({ type: 'ERROR', data: { action: 'ERROR', message: 'No hay conexion con el servidor para unirse a una sala.' } });
      return;
    }
    const id = `vozart-${Date.now().toString(36)}`;
    ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: id }));
  }, [addCommand]);

  const handleLeaveRoom = useCallback(() => {
    if (!roomId) return;
    wsRef.current?.send(JSON.stringify({ type: 'LEAVE_ROOM', roomId }));
    setRoomId(null);
    setCollaborators(0);
  }, [roomId]);

  const syncCanvasToRoom = useCallback((canvasJson: string) => {
    if (!roomId) return;
    wsRef.current?.send(JSON.stringify({ type: 'CANVAS_UPDATE', roomId, data: { canvasJson, timestamp: Date.now() } }));
  }, [roomId]);

  const handleGaze = useCallback((x: number, y: number) => {
    const canvasEl = document.querySelector('canvas');
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const cx = rect.left + x * rect.width;
    const cy = rect.top + y * rect.height;
    const ev = new MouseEvent('mousemove', { clientX: cx, clientY: cy });
    canvasEl.dispatchEvent(ev);
  }, []);

  const handleHandGesture = useCallback((gesture: string) => {
    const c = canvasApiRef.current;
    if (!c) return;
    if (gesture === 'open') {
      addCommand({ type: 'ERROR', data: { action: 'INFO', message: 'Mano detectada: modo dibujo activo.' } });
    } else if (gesture === 'fist') {
      addCommand({ type: 'ERROR', data: { action: 'INFO', message: 'Puño: dibujo en pausa.' } });
    }
  }, [addCommand]);
  useEffect(() => {
    const poll = setInterval(() => {
      const list = canvasApiRef.current?.getObjectList() ?? [];
      setCanvasObjects(prev => {
        if (prev.length === list.length && prev.every((v, i) => v === list[i])) return prev;
        return list;
      });
    }, 1000);
    return () => clearInterval(poll);
  }, []);

  const currentProvider = providers.find(p => p.name === selectedProvider);

  const handleWorkProfileChange = useCallback((profile: WorkProfile) => {
    setWorkProfile(profile);
    const preset = getProfilePreset(profile);
    const byName = new Map(layers.map(l => [l.name, l]));
    const next = preset.layersNames.map((name, i) => {
      const existing = byName.get(name);
      if (existing) return existing;
      return { id: `layer-${profile}-${i}-${Date.now()}`, name, visible: true };
    });
    if (next.length > 0) {
      setLayers(next);
      setActiveLayerId(next[0].id ?? 'layer-ia');
    }
    addCommand({
      type: 'ERROR',
      data: {
        action: 'INFO',
        message: `Perfil "${preset.label}" activado. ${preset.description}`,
      },
    });
  }, [addCommand, layers]);

  const handleAddLayer = useCallback(() => {
    const n = layers.length + 1;
    const newLayer: Layer = { id: `layer-${Date.now()}`, name: `Capa ${n}`, visible: true };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, [layers.length]);

  const handleRemoveLayer = useCallback((id: string) => {
    if (layers.length <= 1) return;
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(layers[0].id);
  }, [layers, activeLayerId]);

  const handleToggleLayer = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  }, []);

  const handleRenameLayer = useCallback((id: string, name: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l));
  }, []);

  const handleToggleLockLayer = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  }, []);

  const handleLayerOpacity = useCallback((id: string, opacity: number) => {
    const clamped = Math.max(0, Math.min(1, opacity));
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity: clamped } : l));
  }, []);

  const handleMoveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx === -1) return prev;
      const newPos = direction === 'up' ? idx + 1 : idx - 1;
      if (newPos < 0 || newPos >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newPos]] = [next[newPos], next[idx]];
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(COLLABORATOR_STORAGE_KEY, collaboratorName);
  }, [collaboratorName]);

  useEffect(() => {
    if (!currentCanvasJson) return;
    setAutosaveStatus('Guardando...');
    if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = window.setTimeout(() => {
      const projectId = currentProjectId ?? createProjectId();
      const snapshot: ProjectSnapshot = {
        id: projectId,
        name: projectName.trim() || 'Proyecto VozArt',
        canvasJson: currentCanvasJson,
        layers,
        workProfile,
        collaboratorName: collaboratorName.trim() || 'Invitado',
        updatedAt: new Date().toISOString(),
      };
      setCurrentProjectId(projectId);
      setProjects(prev => {
        const next = [snapshot, ...prev.filter(project => project.id !== projectId)].slice(0, 12);
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);
      setAutosaveStatus('Guardado');
    }, 700);

    return () => {
      if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current);
    };
  }, [collaboratorName, currentCanvasJson, currentProjectId, layers, projectName, workProfile]);

  const handleNewProject = useCallback(() => {
    const profile = workProfile;
    const nextLayers = makeLayersForProfile(profile);
    const nextProjectId = createProjectId();
    setCurrentProjectId(nextProjectId);
    setProjectName(`Proyecto ${new Date().toLocaleDateString('es-ES')}`);
    setLayers(nextLayers);
    setActiveLayerId(nextLayers[0]?.id || 'layer-ia');
    setInitialCanvasJson(null);
    setCurrentCanvasJson('{"objects":[]}');
    canvasApiRef.current?.loadJSON(null);
    localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, nextProjectId);
    addCommand({ type: 'ERROR', data: { action: 'INFO', message: 'Proyecto nuevo creado.' } });
  }, [addCommand, workProfile]);

  const handleOpenProject = useCallback((projectId: string) => {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    setCurrentProjectId(project.id);
    setProjectName(project.name);
    setWorkProfile(project.workProfile);
    setLayers(project.layers);
    setActiveLayerId(project.layers[0]?.id || 'layer-ia');
    setInitialCanvasJson(project.canvasJson);
    if (project.collaboratorName) setCollaboratorName(project.collaboratorName);
    canvasApiRef.current?.loadJSON(project.canvasJson);
    localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, project.id);
    const params = new URLSearchParams(window.location.search);
    params.set('project', project.id);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [projects]);

  const handleDeleteProject = useCallback((projectId: string) => {
    const nextProjects = projects.filter(project => project.id !== projectId);
    setProjects(nextProjects);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
    if (currentProjectId === projectId) {
      const fallback = nextProjects[0];
      if (fallback) {
        setCurrentProjectId(fallback.id);
        setProjectName(fallback.name);
        setWorkProfile(fallback.workProfile);
        setLayers(fallback.layers);
        setActiveLayerId(fallback.layers[0]?.id || 'layer-ia');
        setCurrentCanvasJson(fallback.canvasJson);
        canvasApiRef.current?.loadJSON(fallback.canvasJson);
      } else {
        handleNewProject();
      }
    }
  }, [currentProjectId, handleNewProject, projects]);

  const handleExportProject = useCallback(() => {
    if (!currentCanvasJson) return;
    const snapshot: ProjectSnapshot = {
      id: currentProjectId ?? createProjectId(),
      name: projectName.trim() || 'Proyecto VozArt',
      canvasJson: currentCanvasJson,
      layers,
      workProfile,
      collaboratorName: collaboratorName.trim() || 'Invitado',
      updatedAt: new Date().toISOString(),
    };
    downloadJSON(`${snapshot.name.replace(/\s+/g, '-').toLowerCase() || 'vozart-project'}.vozart.json`, JSON.stringify(snapshot, null, 2));
  }, [collaboratorName, currentCanvasJson, currentProjectId, layers, projectName, workProfile]);

  const handleImportProject = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as Partial<ProjectSnapshot>;
        if (!parsed.canvasJson || !Array.isArray(parsed.layers) || !parsed.workProfile) throw new Error('Proyecto inválido');
        const importedId = parsed.id || createProjectId();
        setCurrentProjectId(importedId);
        setProjectName(parsed.name || 'Proyecto importado');
        setLayers(parsed.layers);
        setActiveLayerId(parsed.layers[0]?.id || 'layer-ia');
        setWorkProfile(parsed.workProfile);
        setCollaboratorName(parsed.collaboratorName || collaboratorName);
        setInitialCanvasJson(parsed.canvasJson);
        setCurrentCanvasJson(parsed.canvasJson);
        canvasApiRef.current?.loadJSON(parsed.canvasJson);
        addCommand({ type: 'ERROR', data: { action: 'INFO', message: `Proyecto "${parsed.name || 'importado'}" cargado.` } });
      } catch {
        addCommand({ type: 'ERROR', data: { action: 'ERROR', message: 'No se pudo importar el proyecto. JSON inválido.' } });
      }
    };
    reader.readAsText(file);
  }, [addCommand, collaboratorName]);

  const handleCopyShareUrl = useCallback(async () => {
    const projectId = currentProjectId ?? createProjectId();
    const params = new URLSearchParams(window.location.search);
    params.set('project', projectId);
    params.set('user', collaboratorName.trim() || 'Invitado');
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      addCommand({ type: 'ERROR', data: { action: 'INFO', message: 'URL compartible copiada.' } });
    } catch {
      addCommand({ type: 'ERROR', data: { action: 'INFO', message: url } });
    }
  }, [addCommand, collaboratorName, currentProjectId]);

  const updateAccessibility = useCallback((key: keyof AccessibilitySettings, value: boolean) => {
    setAccessibility(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col h-dvh font-sans overflow-hidden select-none",
        accessibility.highContrast ? "bg-black text-white" : "bg-slate-950",
        accessibility.easyRead && "tracking-wide",
        accessibility.largeUi && "text-[115%]",
        accessibility.reduceMotion && "[&_*]:!transition-none [&_*]:!animate-none"
      )}
    >
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
          <ErrorBoundary>
            <CanvasInclusivo commands={commands} canvasApiRef={canvasApiRef} layers={layers} activeLayerId={activeLayerId} onToggleLayer={handleToggleLayer} accessibility={accessibility} workProfile={workProfile} profilePalette={getProfilePreset(workProfile).palette} profileShowGrid={getProfilePreset(workProfile).showGrid} profileBrush={getProfilePreset(workProfile).brush} profileBrushWidth={getProfilePreset(workProfile).brushWidth} initialCanvasJson={initialCanvasJson} onCanvasChange={(json) => { setCurrentCanvasJson(json); syncCanvasToRoom(json); }} />
          </ErrorBoundary>
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
              isProcessing={isProcessing}
              layers={layers}
              activeLayerId={activeLayerId}
              onAddLayer={handleAddLayer}
              onRemoveLayer={handleRemoveLayer}
              onToggleLayer={handleToggleLayer}
              onRenameLayer={handleRenameLayer}
              onToggleLockLayer={handleToggleLockLayer}
              onLayerOpacity={handleLayerOpacity}
              onMoveLayer={handleMoveLayer}
              onSelectLayer={setActiveLayerId}
              accessibility={accessibility}
              onAccessibilityChange={updateAccessibility}
              workProfile={workProfile}
              onWorkProfileChange={handleWorkProfileChange}
              projectName={projectName}
              onProjectNameChange={setProjectName}
              collaboratorName={collaboratorName}
              onCollaboratorNameChange={setCollaboratorName}
              projects={projects}
              currentProjectId={currentProjectId}
              autosaveStatus={autosaveStatus}
              onNewProject={handleNewProject}
              onOpenProject={handleOpenProject}
              onDeleteProject={handleDeleteProject}
              onExportProject={handleExportProject}
              onImportProject={handleImportProject}
              onCopyShareUrl={handleCopyShareUrl}
              onClose={() => setSidebarOpen(false)}
              onInspiration={handleInspiration}
              onRefineSelection={handleRefineSelection}
              canvasObjects={canvasObjects}
              handTrackingActive={handTrackingActive}
              onToggleHandTracking={() => setHandTrackingActive(prev => !prev)}
              roomId={roomId}
              collaborators={collaborators}
              onJoinRoom={handleJoinRoom}
              onLeaveRoom={handleLeaveRoom}
              eyeTrackingActive={eyeTrackingActive}
              onToggleEyeTracking={() => setEyeTrackingActive(prev => !prev)}
              storyMode={storyMode}
              onStoryCommand={handleStoryCommand}
              onExitStoryMode={() => setStoryMode(false)}
              autoMode={autoMode}
              onToggleAutoMode={() => setAutoMode(prev => !prev)}
              pendingActions={pendingActions}
              onConfirmAction={handleConfirmAction}
              onRejectAction={handleRejectAction}
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
          <span
            title={serverHealth.ok ? `Servidor OK v${serverHealth.version ?? '?'} – ${serverHealth.providerCount ?? 0} proveedores` : 'Servidor no responde. Reintentando cada 30s.'}
            className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded", serverHealth.ok ? "text-emerald-400" : "text-amber-400")}
          >
            <Activity size={11} />
            <span className="hidden sm:inline">{serverHealth.ok ? (serverHealth.version || 'OK') : 'OFF'}</span>
          </span>
        </div>
        <span className="text-slate-600">v1.5.0</span>
      </footer>

      <Suspense fallback={null}>
        <HandTracking isActive={handTrackingActive} onGesture={handleHandGesture} />
      </Suspense>
      <Suspense fallback={null}>
        <EyeTracking isActive={eyeTrackingActive} onGaze={handleGaze} />
      </Suspense>
    </div>
  );
}
