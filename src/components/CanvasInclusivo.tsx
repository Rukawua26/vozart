import { useEffect, useRef, useState, useCallback, MutableRefObject } from 'react';
import * as fabric from 'fabric';
import { Pencil, Square, Circle, Triangle, Trash2, Undo2, Redo2, Download, Move, PenTool, Hexagon, ImageIcon, Blend, Droplets, Brush } from 'lucide-react';
import { cn, withAlpha } from '../lib/utils';
import type { AccessibilitySettings, AppCommand, Layer, WorkProfile } from '../types';
import { createCustomBrush, setPointerProps, CustomBrushType } from './customBrushes';

interface CanvasApi {
  exportPNG: () => void;
  reassignObjectLayer: (objectId: string, toLayerId: string) => void;
  loadJSON: (json?: string | null) => void;
  getObjectList: () => string[];
  getSelectedObjectInfo: () => string;
}

interface CanvasProps {
  commands: AppCommand[];
  canvasApiRef: MutableRefObject<CanvasApi | null>;
  layers: Layer[];
  activeLayerId: string;
  onToggleLayer: (id: string) => void;
  accessibility: AccessibilitySettings;
  workProfile: WorkProfile;
  profilePalette?: string[];
  profileShowGrid?: boolean;
  profileBrush?: 'pencil' | 'circle' | 'spray' | 'ink' | 'charcoal' | 'watercolor';
  profileBrushWidth?: number;
  initialCanvasJson?: string | null;
  onCanvasChange?: (json: string) => void;
}

const MAX_HISTORY = 50;
const MAX_HISTORY_SIZE_BYTES = 500_000;
const STORAGE_KEY = 'vozart-canvas-state';

type ToolType = 'pencil' | 'rect' | 'circle' | 'triangle' | 'curve' | 'polygon';

type BrushType = 'pencil' | 'circle' | 'spray' | 'ink' | 'charcoal' | 'watercolor' | 'oil' | 'charcoal_pro' | 'spray_pro' | 'watercolor_pro' | 'smudge';

type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'difference' | 'color-dodge' | 'darken' | 'lighten';

const TOOLS: { type: ToolType; icon: typeof Pencil; label: string }[] = [
  { type: 'pencil', icon: Pencil, label: 'Pincel' },
  { type: 'rect', icon: Square, label: 'Rectángulo' },
  { type: 'circle', icon: Circle, label: 'Círculo' },
  { type: 'triangle', icon: Triangle, label: 'Triángulo' },
  { type: 'curve', icon: PenTool, label: 'Curva' },
  { type: 'polygon', icon: Hexagon, label: 'Polígono' },
];

const DEFAULT_SWATCHES = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#111827', '#FFFFFF'];
const COLOR_SWATCHES = DEFAULT_SWATCHES;

function makeShape(type: ToolType, color: string, size = 120, strokeWidth = 2) {
  const config = { left: 200, top: 150, fill: color, stroke: '#0F172A', strokeWidth, width: size, height: size };
  switch (type) {
    case 'rect': return new fabric.Rect(config);
    case 'circle': return new fabric.Circle({ ...config, radius: size / 2 });
    case 'triangle': return new fabric.Triangle(config);
    case 'curve': {
      const path = new fabric.Path(`M ${200} ${200} C ${200 + size * 0.5} ${150} ${200 + size * 0.5} ${250} ${200 + size} ${200}`, {
        left: 150, top: 100, fill: '', stroke: color || '#3B82F6', strokeWidth: strokeWidth + 1,
      });
      return path;
    }
    case 'polygon': {
      const sides = 6;
      const cx = size / 2, cy = size / 2, r = size / 2;
      const pts = Array.from({ length: sides }, (_, i) => {
        const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
        return `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
      }).join(' L ');
      const poly = new fabric.Polygon(
        pts.split(' L ').map(p => { const [x, y] = p.split(' '); return { x: Number(x), y: Number(y) }; }),
        { left: 150, top: 100, fill: color, stroke: '#0F172A', strokeWidth }
      );
      return poly;
    }
    default: return null;
  }
}

export const CanvasInclusivo: React.FC<CanvasProps> = ({ commands, canvasApiRef, layers, activeLayerId, accessibility, workProfile, profilePalette, profileShowGrid, profileBrush, profileBrushWidth, initialCanvasJson, onCanvasChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [color, setColor] = useState('#3B82F6');
  const [brushWidth, setBrushWidth] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [brushType, setBrushType] = useState<BrushType>('pencil');
  const [objectSize, setObjectSize] = useState(120);
  const [objectStrokeWidth, setObjectStrokeWidth] = useState(2);
  const [panelPosition, setPanelPosition] = useState({ x: 8, y: 8 });
  const [showGrid, setShowGrid] = useState(false);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const [showAnimation, setShowAnimation] = useState(false);
  const [snappingEnabled, setSnappingEnabled] = useState(false);
  const [blendMode, setBlendMode] = useState<BlendMode>('source-over');
  const [showBlendPicker, setShowBlendPicker] = useState(false);
  const [referenceImage, setReferenceImage] = useState<fabric.Image | null>(null);
  const [animTarget, setAnimTarget] = useState({ x: 200, y: 150, rotation: 0, scale: 1, opacity: 1 });
  const [isAnimating, setIsAnimating] = useState(false);
  const animTimeoutRef = useRef<number | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [liveMessage, setLiveMessage] = useState('Lienzo listo.');
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const initializedRef = useRef(false);
  const drawingRef = useRef(false);
  const backgroundColorRef = useRef('#ffffff');
  const lastProcessedCommandRef = useRef<AppCommand | null>(commands[commands.length - 1] ?? null);
  const pendingResizeRef = useRef(false);
  const panelDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const activeLayerRef = useRef(activeLayerId);
  activeLayerRef.current = activeLayerId;
  const magnifierEnabledRef = useRef(false);
  magnifierEnabledRef.current = showMagnifier;
  const blendModeRef = useRef(blendMode);
  blendModeRef.current = blendMode;
  const snappingRef = useRef(false);
  const guideLinesRef = useRef<{ x: number; y: number; dir: 'h' | 'v' }[]>([]);

  const persistCanvas = useCallback((c: fabric.Canvas, serialized?: string) => {
    try {
      const json = serialized ?? JSON.stringify(c.toJSON());
      if (json.length > MAX_HISTORY_SIZE_BYTES) {
        console.warn('Canvas demasiado grande para guardar en localStorage');
        return;
      }
      localStorage.setItem(STORAGE_KEY, json);
      onCanvasChange?.(json);
    } catch (e) {
      console.warn('No se pudo guardar el canvas:', e);
    }
  }, [onCanvasChange]);

  const saveState = useCallback((c: fabric.Canvas) => {
    const json = JSON.stringify(c.toJSON());
    if (json.length > MAX_HISTORY_SIZE_BYTES) {
      historyRef.current = [json];
      historyIndexRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
      persistCanvas(c, json);
      return;
    }
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
    persistCanvas(c, json);
  }, [persistCanvas]);

  const undo = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c || historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const json = historyRef.current[historyIndexRef.current];
    c.loadFromJSON(JSON.parse(json)).then(() => {
      c.renderAll();
      if (typeof c.backgroundColor === 'string') backgroundColorRef.current = c.backgroundColor;
      persistCanvas(c, json);
    });
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, [persistCanvas]);

  const redo = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const json = historyRef.current[historyIndexRef.current];
    c.loadFromJSON(JSON.parse(json)).then(() => {
      c.renderAll();
      if (typeof c.backgroundColor === 'string') backgroundColorRef.current = c.backgroundColor;
      persistCanvas(c, json);
    });
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [persistCanvas]);

  const exportPNG = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const link = document.createElement('a');
    link.download = `vozart-${Date.now()}.png`;
    link.href = c.toDataURL({ format: 'png', multiplier: 2 });
    link.click();
  }, []);

  const downloadFile = (filename: string, content: string, type: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportJSON = () => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    downloadFile(`vozart-${Date.now()}.json`, JSON.stringify(c.toJSON(), null, 2), 'application/json');
  };

  const exportSVG = () => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    downloadFile(`vozart-${Date.now()}.svg`, c.toSVG(), 'image/svg+xml');
  };

  const exportJPG = () => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const link = document.createElement('a');
    link.download = `vozart-${Date.now()}.jpg`;
    link.href = c.toDataURL({ format: 'jpeg', multiplier: 2 });
    link.click();
  };

  const addReferenceImage = (file: File) => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(String(reader.result)).then((img) => {
        const cw = c.width || 512;
        const ch = c.height || 512;
        const scale = Math.min(cw * 0.9 / (img.width || cw), ch * 0.9 / (img.height || ch));
        img.set({ scaleX: scale, scaleY: scale, left: (cw - (img.width || cw) * scale) / 2, top: (ch - (img.height || ch) * scale) / 2, opacity: 0.3, selectable: false, evented: false, name: '_reference_' });
        c.add(img);
        c.renderAll();
        setLiveMessage('Imagen de referencia añadida.');
      });
    };
    reader.readAsDataURL(file);
  };

  const setCanvasBlendMode = (mode: BlendMode) => {
    setBlendMode(mode);
    setShowBlendPicker(false);
    setLiveMessage(`Modo fusión: ${mode}`);
  };

  const BLEND_MODES: { value: BlendMode; label: string }[] = [
    { value: 'source-over', label: 'Normal' },
    { value: 'multiply', label: 'Multiplicar' },
    { value: 'screen', label: 'Pantalla' },
    { value: 'overlay', label: 'Superponer' },
    { value: 'soft-light', label: 'Luz suave' },
    { value: 'difference', label: 'Diferencia' },
    { value: 'color-dodge', label: 'Sobreexponer' },
    { value: 'darken', label: 'Oscurecer' },
    { value: 'lighten', label: 'Aclarar' },
  ];

  const resetView = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    c.setViewportTransform([1, 0, 0, 1, 0, 0]);
    c.setZoom(1);
    c.requestRenderAll();
  }, []);

  const handleClear = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    c.clear();
    backgroundColorRef.current = '#ffffff';
    c.backgroundColor = backgroundColorRef.current;
    c.renderAll();
    saveState(c);
  }, [saveState]);

  const handleCanvasKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const c = fabricCanvasRef.current;
    const selected = c?.getActiveObject();
    const step = event.shiftKey ? 10 : 2;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
      setLiveMessage('Deshacer.');
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
      setLiveMessage('Rehacer.');
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelectedObject();
      setLiveMessage('Selección borrada.');
    }
    if (event.key.toLowerCase() === 'g') {
      const next = !showGrid;
      setShowGrid(next);
      setLiveMessage(next ? 'Grid visible.' : 'Grid oculto.');
    }
    if (event.key.toLowerCase() === 'l') {
      event.preventDefault();
      const next = !showMagnifier;
      setShowMagnifier(next);
      setLiveMessage(next ? 'Lupa activada.' : 'Lupa desactivada.');
    }
    if (event.key === '0') {
      event.preventDefault();
      resetView();
      setLiveMessage('Vista reiniciada.');
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      if (!c) return;
      c.setZoom(Math.min(4, c.getZoom() + 0.1));
      c.requestRenderAll();
      setLiveMessage(`Zoom ${Math.round(c.getZoom() * 100)} por ciento.`);
    }
    if (event.key === '-') {
      event.preventDefault();
      if (!c) return;
      c.setZoom(Math.max(0.2, c.getZoom() - 0.1));
      c.requestRenderAll();
      setLiveMessage(`Zoom ${Math.round(c.getZoom() * 100)} por ciento.`);
    }
    if (!selected) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (event.key === 'ArrowLeft') selected.left = (selected.left || 0) - step;
      if (event.key === 'ArrowRight') selected.left = (selected.left || 0) + step;
      if (event.key === 'ArrowUp') selected.top = (selected.top || 0) - step;
      if (event.key === 'ArrowDown') selected.top = (selected.top || 0) + step;
      selected.setCoords();
      c?.requestRenderAll();
      if (c) saveState(c);
      setLiveMessage(`Objeto movido ${step} píxeles.`);
    }
  };

  const addImageFromFile = (file: File) => {
    const c = fabricCanvasRef.current;
    if (!c) return;

    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(String(reader.result)).then((img) => {
        const cw = c.width || 512;
        const ch = c.height || 512;
        const scale = Math.min(cw * 0.8 / (img.width || cw), ch * 0.8 / (img.height || ch));
        img.set({ scaleX: scale, scaleY: scale, left: (cw - (img.width || cw) * scale) / 2, top: (ch - (img.height || ch) * scale) / 2 });
        c.add(img);
        c.setActiveObject(img);
        c.renderAll();
        saveState(c);
      });
    };
    reader.readAsDataURL(file);
  };

  const getObjectList = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return [];
    return c.getObjects().map((obj) => {
      const id = (obj as any).name || (obj as any).__uid || '';
      const type = obj.type || 'unknown';
      const layer = (obj as any)._layer || 'sin-capa';
      return `${type}|${id}|${layer}`;
    });
  }, []);

  const getSelectedObjectInfo = useCallback(() => {
    const c = fabricCanvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return '';
    const color = obj.type === 'path' ? obj.stroke : obj.fill;
    return JSON.stringify({
      type: obj.type,
      color: typeof color === 'string' ? color : '',
      width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
      height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      opacity: obj.opacity,
    });
  }, []);

  const playAnimation = useCallback(() => {
    const c = fabricCanvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj || isAnimating) return;
    setIsAnimating(true);
    obj.animate(
      { left: animTarget.x, top: animTarget.y, angle: animTarget.rotation, scaleX: animTarget.scale, scaleY: animTarget.scale, opacity: animTarget.opacity },
      {
        duration: 1000,
        onChange: () => c.requestRenderAll(),
        onComplete: () => {
          setIsAnimating(false);
          saveState(c);
          setLiveMessage('Animación completada.');
        },
      }
    );
  }, [animTarget, isAnimating, saveState]);

  const reassignObjectLayer = useCallback((objectId: string, toLayerId: string) => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    for (const obj of c.getObjects()) {
      if ((obj as any).name === objectId || (obj as any).__uid === objectId) {
        (obj as any)._layer = toLayerId;
        break;
      }
    }
    c.requestRenderAll();
  }, []);

  const loadJSON = useCallback((json?: string | null) => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    if (!json) {
      c.clear();
      c.backgroundColor = showGrid
        ? new fabric.Pattern({ source: makeGridPattern(), repeat: 'repeat' })
        : backgroundColorRef.current;
      c.isDrawingMode = true;
      c.requestRenderAll();
      saveState(c);
      return;
    }
    c.loadFromJSON(JSON.parse(json)).then(() => {
      if (typeof c.backgroundColor === 'string') backgroundColorRef.current = c.backgroundColor;
      c.renderAll();
      saveState(c);
    }).catch((e) => {
      console.warn('No se pudo importar el proyecto:', e);
    });
  }, [saveState, showGrid]);

  useEffect(() => {
    if (canvasApiRef) canvasApiRef.current = { exportPNG, reassignObjectLayer, loadJSON, getObjectList, getSelectedObjectInfo };
  }, [canvasApiRef, exportPNG, reassignObjectLayer, loadJSON, getObjectList, getSelectedObjectInfo]);

  const resizeCanvas = useCallback((c: fabric.Canvas) => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const nextWidth = Math.floor(width);
    const nextHeight = Math.floor(height);
    if (nextWidth < 20 || nextHeight < 20) return;
    if (drawingRef.current) {
      pendingResizeRef.current = true;
      return;
    }
    if (c.width === nextWidth && c.height === nextHeight) return;
    c.setDimensions({ width: nextWidth, height: nextHeight });
    c.renderAll();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const c = new fabric.Canvas(canvasRef.current, {
      width: Math.floor(width),
      height: Math.floor(height),
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });
    (c as any).enablePointerEvents = true;

    const trackPointer = (ev: PointerEvent) => {
      setPointerProps(ev.pressure || 0.5, ev.tiltX || 0, ev.tiltY || 0);
    };
    canvasRef.current.addEventListener('pointermove', trackPointer);
    canvasRef.current.addEventListener('pointerdown', trackPointer);

    c.freeDrawingBrush = new fabric.PencilBrush(c);
    c.freeDrawingBrush.color = color;
    c.freeDrawingBrush.width = brushWidth;

    c.on('object:added', (e) => {
      if (e.target && !(e.target as any)._layer) (e.target as any)._layer = activeLayerRef.current;
      saveState(c);
    });
    c.on('object:modified', () => saveState(c));
    c.on('path:created', (e) => {
      if (e.path && brushOpacity < 1) e.path.set({ opacity: brushOpacity });
      saveState(c);
    });
    c.on('selection:created', (event) => syncSelectedObject(event.selected?.[0]));
    c.on('selection:updated', (event) => syncSelectedObject(event.selected?.[0]));

    c.on('mouse:wheel', (opt) => {
      const ev = opt.e as WheelEvent;
      const delta = ev.deltaY;
      let zoom = c.getZoom() * (0.999 ** delta);
      zoom = Math.max(0.1, Math.min(20, zoom));
      c.zoomToPoint(new fabric.Point(ev.offsetX, ev.offsetY), zoom);
      ev.preventDefault();
      ev.stopPropagation();
    });

    let isPanning = false;
    let lastPos = { x: 0, y: 0 };

    c.on('mouse:down', (opt) => {
      const ev = opt.e as MouseEvent;
      drawingRef.current = true;
      ev.preventDefault();
      if (c.isDrawingMode && c.contextTop && blendModeRef.current !== 'source-over') {
        c.contextTop.globalCompositeOperation = blendModeRef.current;
      }
      if (ev.altKey) {
        isPanning = true;
        lastPos = { x: ev.clientX, y: ev.clientY };
        c.selection = false;
      }
    });

    c.on('mouse:move', (opt) => {
      opt.e.preventDefault();
      const ev = opt.e as MouseEvent;
      if (magnifierEnabledRef.current) {
        setMagnifierPos({ x: ev.offsetX, y: ev.offsetY });
      }
      if (!isPanning) return;
      const vpt = c.viewportTransform!;
      vpt[4] += ev.clientX - lastPos.x;
      vpt[5] += ev.clientY - lastPos.y;
      c.requestRenderAll();
      lastPos = { x: ev.clientX, y: ev.clientY };
    });

    c.on('mouse:up', () => {
      drawingRef.current = false;
      isPanning = false;
      c.selection = true;
      if (c.contextTop) c.contextTop.clearRect(0, 0, c.width || 2000, c.height || 2000);
      guideLinesRef.current = [];
      if (pendingResizeRef.current) {
        pendingResizeRef.current = false;
        resizeCanvas(c);
      }
    });

    const SNAP_THRESHOLD = 6;
    c.on('object:moving', (opt) => {
      if (!snappingRef.current) return;
      const obj = opt.target;
      if (!obj) return;
      const objs = c.getObjects().filter(o => o !== obj && o.selectable);
      const snapLines: { x: number; y: number; dir: 'h' | 'v' }[] = [];
      const oBounds = obj.getBoundingRect();
      const oCx = oBounds.left + oBounds.width / 2;
      const oCy = oBounds.top + oBounds.height / 2;
      const oR = oBounds.left + oBounds.width;
      const oB = oBounds.top + oBounds.height;
      for (const other of objs) {
        const b = other.getBoundingRect();
        const checks: { val: number; target: number; dir: 'h' | 'v'; snapTo: number }[] = [
          { val: oBounds.left, target: b.left, dir: 'v', snapTo: b.left },
          { val: oR, target: b.left + b.width, dir: 'v', snapTo: b.left + b.width },
          { val: oBounds.left, target: b.left + b.width, dir: 'v', snapTo: b.left + b.width },
          { val: oR, target: b.left, dir: 'v', snapTo: b.left },
          { val: oCx, target: b.left + b.width / 2, dir: 'v', snapTo: b.left + b.width / 2 },
          { val: oBounds.top, target: b.top, dir: 'h', snapTo: b.top },
          { val: oB, target: b.top + b.height, dir: 'h', snapTo: b.top + b.height },
          { val: oBounds.top, target: b.top + b.height, dir: 'h', snapTo: b.top + b.height },
          { val: oB, target: b.top, dir: 'h', snapTo: b.top },
          { val: oCy, target: b.top + b.height / 2, dir: 'h', snapTo: b.top + b.height / 2 },
        ];
        for (const ch of checks) {
          if (Math.abs(ch.val - ch.target) < SNAP_THRESHOLD) {
            if (ch.dir === 'v') {
              const dx = ch.snapTo - ch.val;
              obj.left = (obj.left || 0) + dx;
              snapLines.push({ x: ch.snapTo, y: Math.min(oBounds.top, b.top), dir: 'v' });
            } else {
              const dy = ch.snapTo - ch.val;
              obj.top = (obj.top || 0) + dy;
              snapLines.push({ y: ch.snapTo, x: Math.min(oBounds.left, b.left), dir: 'h' });
            }
            obj.setCoords();
            break;
          }
        }
      }
      if (snapLines.length > 0 && c.contextTop) {
        const ctx = c.contextTop;
        ctx.clearRect(0, 0, c.width || 2000, c.height || 2000);
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (const sl of snapLines) {
          ctx.beginPath();
          if (sl.dir === 'v') {
            ctx.moveTo(sl.x, sl.y);
            ctx.lineTo(sl.x, sl.y + 2000);
          } else {
            ctx.moveTo(sl.x, sl.y);
            ctx.lineTo(sl.x + 2000, sl.y);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    });

    const preventTouchScroll = (event: TouchEvent) => event.preventDefault();
    containerRef.current.addEventListener('touchstart', preventTouchScroll, { passive: false });
    containerRef.current.addEventListener('touchmove', preventTouchScroll, { passive: false });

    const ro = new ResizeObserver(() => resizeCanvas(c));
    ro.observe(containerRef.current);

    if (!initializedRef.current) {
      initializedRef.current = true;
      try {
        const saved = initialCanvasJson ?? localStorage.getItem(STORAGE_KEY);
        if (saved) {
          c.loadFromJSON(JSON.parse(saved)).then(() => {
            if (typeof c.backgroundColor === 'string') backgroundColorRef.current = c.backgroundColor;
            c.renderAll();
            saveState(c);
          });
        } else {
          saveState(c);
        }
      } catch (e) {
        console.warn('No se pudo cargar el canvas:', e);
        saveState(c);
      }
    } else {
      saveState(c);
    }

    fabricCanvasRef.current = c;

    return () => {
      ro.disconnect();
      containerRef.current?.removeEventListener('touchstart', preventTouchScroll);
      containerRef.current?.removeEventListener('touchmove', preventTouchScroll);
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('pointermove', trackPointer);
        canvasRef.current.removeEventListener('pointerdown', trackPointer);
      }
      c.dispose();
    };
  }, []);

  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c || !profilePalette || profilePalette.length === 0) return;
    if (profilePalette[0]) setColor(profilePalette[0]);
  }, [workProfile, profilePalette]);

  useEffect(() => {
    if (profileShowGrid === undefined) return;
    setShowGrid(profileShowGrid);
  }, [workProfile, profileShowGrid]);

  useEffect(() => {
    if (profileBrush === undefined) return;
    setBrushType(profileBrush);
  }, [workProfile, profileBrush]);

  useEffect(() => {
    if (profileBrushWidth === undefined) return;
    setBrushWidth(profileBrushWidth);
  }, [workProfile, profileBrushWidth]);

  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    let brush = c.freeDrawingBrush;

    if (brushType === 'oil' || brushType === 'watercolor_pro' || brushType === 'charcoal_pro' || brushType === 'spray_pro' || brushType === 'smudge') {
      brush = createCustomBrush(c, brushType, color, brushWidth, brushOpacity);
    } else if (brushType === 'circle') {
      if (!(brush instanceof fabric.CircleBrush)) brush = new fabric.CircleBrush(c);
    } else if (brushType === 'spray') {
      if (!(brush instanceof fabric.SprayBrush)) brush = new fabric.SprayBrush(c);
    } else if (!(brush instanceof fabric.PencilBrush) || brush instanceof fabric.CircleBrush || brush instanceof fabric.SprayBrush) {
      brush = new fabric.PencilBrush(c);
    }

    c.freeDrawingBrush = brush;
    brush.width = brushWidth;
    brush.color = color;

    if (brushType === 'ink') {
      brush.width = Math.max(1, brushWidth * 0.9);
      brush.color = withAlpha(color, Math.min(1, brushOpacity));
    }

    if (brushType === 'charcoal') {
      brush.width = Math.max(2, brushWidth * 1.7);
      brush.color = withAlpha(color, Math.min(0.7, brushOpacity));
    }

    if (brushType === 'watercolor') {
      brush.width = Math.max(4, brushWidth * 2.2);
      brush.color = withAlpha(color, Math.min(0.35, brushOpacity));
    }

    if (brushType === 'spray' && brush instanceof fabric.SprayBrush) {
      brush.width = Math.max(10, brushWidth * 2);
      brush.color = withAlpha(color, Math.min(0.8, brushOpacity));
      brush.density = Math.max(12, Math.round(brushWidth * 2.5));
      brush.dotWidth = Math.max(1, Math.round(brushWidth / 4));
      brush.dotWidthVariance = Math.max(1, Math.round(brushWidth / 5));
      brush.randomOpacity = true;
    }
  }, [brushType, color, brushOpacity, brushWidth]);

  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const layerMap = new Map(layers.map(l => [l.id, l]));
    for (const obj of c.getObjects()) {
      const layerId = (obj as any)._layer;
      const layer = layerId ? layerMap.get(layerId) : undefined;
      if (layer) {
        obj.visible = layer.visible;
        const layerOp = layer.opacity ?? 1;
        const baseOp = (obj as any)._baseOpacity ?? obj.opacity ?? 1;
        if ((obj as any)._baseOpacity === undefined) (obj as any)._baseOpacity = obj.opacity ?? 1;
        obj.opacity = baseOp * layerOp;
        obj.selectable = !layer.locked;
        obj.evented = !layer.locked;
      }
    }
    c.requestRenderAll();
  }, [layers]);

  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c || !showMagnifier) return;
    const magCanvas = magnifierCanvasRef.current;
    if (!magCanvas) return;
    const magCtx = magCanvas.getContext('2d');
    if (!magCtx) return;
    const size = 120;
    const zoom = 3;
    const half = size / 2;
    const vpt = c.viewportTransform;
    const z = vpt ? vpt[0] : 1;
    const sx = magnifierPos.x * z - half / zoom;
    const sy = magnifierPos.y * z - half / zoom;
    magCanvas.width = size;
    magCanvas.height = size;
    magCtx.imageSmoothingEnabled = false;
    try {
      magCtx.drawImage(
        canvasRef.current!,
        sx, sy, size / zoom, size / zoom,
        0, 0, size, size
      );
    } catch { /* fuera del canvas */ }
    magCtx.strokeStyle = '#3B82F6';
    magCtx.lineWidth = 2;
    magCtx.beginPath();
    magCtx.arc(half, half, half - 2, 0, Math.PI * 2);
    magCtx.stroke();
  }, [showMagnifier, magnifierPos]);

  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c || commands.length === 0) return;
    const last = commands[commands.length - 1];
    if (lastProcessedCommandRef.current === last) return;
    lastProcessedCommandRef.current = last;
    if (last.type !== 'AI_ACTION') return;
    const d = last.data;
    const { action } = d;
    switch (action) {
      case 'ADD_SHAPE': {
        if (!d.shape) break;
        const obj = makeShape(d.shape as ToolType, d.color || '#10B981', d.size || 120, objectStrokeWidth);
        if (obj) {
          if (d.left !== undefined) obj.left = d.left;
          if (d.top !== undefined) obj.top = d.top;
          if (d.opacity !== undefined) obj.opacity = d.opacity;
          c.add(obj);
        }
        break;
      }
      case 'ADD_TEXT': {
        if (!d.text) break;
        const txt = new fabric.Text(d.text, {
          left: d.left ?? 200,
          top: d.top ?? 150,
          fontSize: d.size ?? 32,
          fill: d.color || '#111827',
          fontFamily: 'Outfit',
        });
        c.add(txt);
        break;
      }
      case 'CHANGE_BG':
        backgroundColorRef.current = d.color || '#ffffff';
        c.backgroundColor = showGrid
          ? new fabric.Pattern({ source: makeGridPattern(), repeat: 'repeat' })
          : backgroundColorRef.current;
        saveState(c);
        break;
      case 'CLEAR_CANVAS':
        handleClear();
        break;
      case 'GENERATE_IMAGE': {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(d.prompt || 'abstract art')}?width=512&height=512&nofeed=true`;
        fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
          const cw = c.width || 512;
          const ch = c.height || 512;
          const s = Math.min(cw * 0.8 / (img.width || 512), ch * 0.8 / (img.height || 512));
          img.set({ scaleX: s, scaleY: s, left: (cw - (img.width || 512) * s) / 2, top: (ch - (img.height || 512) * s) / 2 });
          c.add(img);
          c.renderAll();
        }).catch(() => {
          c.add(new fabric.Text(`✨ ${d.prompt}`, { left: 100, top: 100, fontSize: 24, fill: '#334155', fontFamily: 'Outfit' }));
          c.renderAll();
        });
        break;
      }
      case 'MODIFY_OBJECT': {
        const target = d.target || 'selected';
        let objs: fabric.Object[] = [];
        if (target === 'all') {
          objs = c.getObjects();
        } else if (target === 'last') {
          const all = c.getObjects();
          if (all.length > 0) objs = [all[all.length - 1]];
        } else {
          const sel = c.getActiveObject();
          if (sel) {
            objs = sel.type === 'activeSelection' && 'getObjects' in sel
              ? (sel as any).getObjects()
              : [sel];
          }
        }
        for (const o of objs) {
          if (d.color !== undefined) {
            o.set(o.type === 'path' ? { stroke: d.color } : { fill: d.color });
          }
          if (d.opacity !== undefined) o.set({ opacity: d.opacity });
          if (d.scaleX !== undefined) o.set({ scaleX: d.scaleX });
          if (d.scaleY !== undefined) o.set({ scaleY: d.scaleY });
        }
        if (objs.length > 0) { c.requestRenderAll(); saveState(c); }
        break;
      }
      case 'DELETE_OBJECT': {
        const target = d.target || 'selected';
        if (target === 'all') {
          handleClear();
        } else if (target === 'last') {
          const all = c.getObjects();
          if (all.length > 0) { c.remove(all[all.length - 1]); c.requestRenderAll(); saveState(c); }
        } else {
          const obj = c.getActiveObject();
          if (obj) {
            if (obj.type === 'activeSelection' && 'forEachObject' in obj) {
              (obj as fabric.ActiveSelection).forEachObject((item) => c.remove(item));
            } else {
              c.remove(obj);
            }
            c.discardActiveObject();
            c.requestRenderAll();
            saveState(c);
          }
        }
        break;
      }
      case 'SET_OPACITY': {
        const value = d.value ?? 1;
        const target = d.target || 'selected';
        let objs: fabric.Object[] = [];
        if (target === 'all') {
          objs = c.getObjects();
        } else if (target === 'last') {
          const all = c.getObjects();
          if (all.length > 0) objs = [all[all.length - 1]];
        } else {
          const sel = c.getActiveObject();
          if (sel) {
            objs = sel.type === 'activeSelection' && 'getObjects' in sel
              ? (sel as any).getObjects()
              : [sel];
          }
        }
        for (const o of objs) o.set({ opacity: value });
        if (objs.length > 0) { c.requestRenderAll(); saveState(c); }
        break;
      }
      case 'MOVE_OBJECT': {
        if (d.left === undefined && d.top === undefined) break;
        const target = d.target || 'selected';
        let obj: fabric.Object | null = null;
        if (target === 'last') {
          const all = c.getObjects();
          if (all.length > 0) obj = all[all.length - 1];
        } else {
          obj = c.getActiveObject();
        }
        if (obj) {
          if (d.left !== undefined) obj.left = d.left;
          if (d.top !== undefined) obj.top = d.top;
          obj.setCoords();
          c.requestRenderAll();
          saveState(c);
        }
        break;
      }
      case 'HARMONIZE_STROKE': {
        const htarget = d.target || 'last';
        let hobj: fabric.Object | null = null;
        if (htarget === 'last') {
          const all = c.getObjects();
          const paths = all.filter(o => o.type === 'path');
          if (paths.length > 0) hobj = paths[paths.length - 1];
        } else {
          hobj = c.getActiveObject();
        }
        if (hobj) {
          if (d.color) hobj.set(hobj.type === 'path' ? { stroke: d.color } : { fill: d.color });
          if (d.opacity !== undefined) hobj.set({ opacity: d.opacity });
          if (d.scaleX !== undefined) hobj.set({ scaleX: d.scaleX });
          if (d.scaleY !== undefined) hobj.set({ scaleY: d.scaleY });
          c.requestRenderAll();
          saveState(c);
        }
        break;
      }
      case 'STORY_SCENE': {
        const sceneActions: any[] = d.actions || [];
        (sceneActions || []).forEach((sa: any, si: number) => {
          setTimeout(() => {
            if (sa.action === 'GENERATE_IMAGE' && sa.prompt) {
              const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(sa.prompt)}?width=512&height=512&nofeed=true`;
              fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
                const cw = c.width || 512;
                const ch = c.height || 512;
                const s = Math.min(cw * 0.8 / (img.width || 512), ch * 0.8 / (img.height || 512));
                img.set({ scaleX: s, scaleY: s, left: (cw - (img.width || 512) * s) / 2, top: (ch - (img.height || 512) * s) / 2, opacity: 0 });
                c.add(img);
                img.animate({ opacity: 1 }, { duration: 800, onChange: () => c.requestRenderAll() });
              }).catch(() => {});
            } else if (sa.action === 'ADD_SHAPE' && sa.shape) {
              const newObj = makeShape(sa.shape as ToolType, sa.color || '#10B981', sa.size || 120, objectStrokeWidth);
              if (newObj) {
                if (sa.left !== undefined) newObj.left = sa.left;
                if (sa.top !== undefined) newObj.top = sa.top;
                if (sa.opacity !== undefined) newObj.opacity = sa.opacity;
                c.add(newObj);
              }
            } else if (sa.action === 'CHANGE_BG' && sa.color) {
              backgroundColorRef.current = sa.color;
              c.backgroundColor = showGrid
                ? new fabric.Pattern({ source: makeGridPattern(), repeat: 'repeat' })
                : backgroundColorRef.current;
            } else if (sa.action === 'CLEAR_CANVAS') {
              handleClear();
            } else if (sa.action === 'ADD_TEXT' && sa.text) {
              const txt = new fabric.Text(sa.text, {
                left: sa.left ?? 200,
                top: sa.top ?? 150,
                fontSize: sa.size ?? 32,
                fill: sa.color || '#111827',
                fontFamily: 'Outfit',
                opacity: 0,
              });
              c.add(txt);
              txt.animate({ opacity: 1 }, { duration: 600, onChange: () => c.requestRenderAll() });
            }
            c.renderAll();
            saveState(c);
          }, si * 1200);
        });
        if (d.transition === 'fade') {
          c.getObjects().forEach(o => {
            if (o.opacity && o.opacity > 0) {
              o.animate({ opacity: 0 }, { duration: 500, onChange: () => c.requestRenderAll() });
            }
          });
        }
        setLiveMessage(`Escena: ${d.sceneDescription || ''}`);
        break;
      }
    }
    c.renderAll();
  }, [commands, handleClear, objectStrokeWidth, saveState, showGrid]);

  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    c.backgroundColor = showGrid
      ? new fabric.Pattern({ source: makeGridPattern(), repeat: 'repeat' })
      : backgroundColorRef.current;
    c.requestRenderAll();
  }, [showGrid]);

  const applyToActiveObject = useCallback((updates: Record<string, unknown>) => {
    const c = fabricCanvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    obj.set(updates);
    obj.setCoords();
    c.requestRenderAll();
    saveState(c);
  }, [saveState]);

  const deleteSelectedObject = useCallback(() => {
    const c = fabricCanvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;

    if (obj.type === 'activeSelection' && 'forEachObject' in obj) {
      (obj as fabric.ActiveSelection).forEachObject((item) => c.remove(item));
    } else {
      c.remove(obj);
    }
    c.discardActiveObject();
    c.requestRenderAll();
    saveState(c);
    setLiveMessage('Objeto eliminado.');
  }, [saveState]);

  const syncSelectedObject = (obj?: fabric.Object) => {
    if (!obj) {
      setLiveMessage('Sin selección.');
      return;
    }
    const selectedColor = obj.type === 'path' ? obj.stroke : obj.fill;
    if (typeof selectedColor === 'string') setColor(selectedColor);
    if (typeof obj.strokeWidth === 'number') setObjectStrokeWidth(obj.strokeWidth);
    if (obj.type === 'path' && typeof obj.strokeWidth === 'number') setBrushWidth(Math.round(obj.strokeWidth));
    if (typeof obj.width === 'number' && obj.width > 0 && obj.type !== 'path') setObjectSize(Math.round(obj.width * (obj.scaleX || 1)));
    setLiveMessage(`Seleccionado ${obj.type || 'objeto'}.`);
  };

  function makeGridPattern() {
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = 32;
    gridCanvas.height = 32;
    const ctx = gridCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(32, 32);
    ctx.lineTo(0, 32);
    ctx.stroke();
    return gridCanvas;
  }

  const changeColor = (nextColor: string) => {
    setColor(nextColor);
    const c = fabricCanvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    obj.set(obj.type === 'path' ? { stroke: nextColor } : { fill: nextColor });
    c.requestRenderAll();
    saveState(c);
    setLiveMessage(`Color cambiado a ${nextColor}.`);
  };

  const changeObjectSize = (nextSize: number) => {
    setObjectSize(nextSize);
    const c = fabricCanvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    obj.set({ scaleX: 1, scaleY: 1 });
    if (obj.type === 'circle') obj.set({ radius: nextSize / 2 });
    else if (obj.type === 'rect' || obj.type === 'triangle') obj.set({ width: nextSize, height: nextSize });
    obj.setCoords();
    c.requestRenderAll();
    saveState(c);
    setLiveMessage(`Tamaño ${nextSize}.`);
  };

  const changeObjectStroke = (nextWidth: number) => {
    setObjectStrokeWidth(nextWidth);
    applyToActiveObject({ stroke: '#0F172A', strokeWidth: nextWidth });
    setLiveMessage(`Borde ${nextWidth}.`);
  };

  const startPanelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    panelDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPosition.x,
      originY: panelPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const dragPanel = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = panelDragRef.current;
    if (!drag) return;
    event.preventDefault();
    const maxX = Math.max(8, window.innerWidth - 340);
    const maxY = Math.max(8, window.innerHeight - 240);
    setPanelPosition({
      x: Math.min(Math.max(8, drag.originX + event.clientX - drag.startX), maxX),
      y: Math.min(Math.max(8, drag.originY + event.clientY - drag.startY), maxY),
    });
  };

  const stopPanelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    panelDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const selectTool = (tool: ToolType) => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    setActiveTool(tool);
    if (tool === 'pencil') {
      c.isDrawingMode = true;
      setLiveMessage('Pincel activo.');
    } else {
      c.isDrawingMode = false;
      const obj = makeShape(tool, color, objectSize, objectStrokeWidth);
      if (obj) { c.add(obj); c.setActiveObject(obj); setLiveMessage(`${tool} insertado.`); }
    }
  };

  const profileHint: Record<WorkProfile, string> = {
    artist: 'Perfil artista: color, textura y composición libre.',
    education: 'Perfil educación: crea recursos visuales claros y explicativos.',
    architecture: 'Perfil arquitectura: usa grid, formas y proporciones.',
    medical: 'Perfil médico: prioriza diagramas claros y etiquetas.',
    legal: 'Perfil legal: prioriza esquemas, flujos y evidencias visuales.',
    diagram: 'Perfil diagrama: estructura ideas con formas, texto y relaciones.',
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col-reverse md:flex-row overflow-hidden touch-none overscroll-none">
      <aside className={cn("h-16 md:h-full md:w-20 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex md:flex-col items-center justify-around md:justify-start md:py-6 px-2 md:px-0 md:gap-3 shrink-0 transition-transform", accessibility.easyRead && "scale-110 origin-bottom-left")}>
        {TOOLS.map(({ type, icon: Icon }) => (
          <button
            key={type}
            onClick={() => selectTool(type)}
            className={cn(
              "w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-md",
              activeTool === type
                ? "bg-blue-600 text-white shadow-blue-500/20 ring-4 ring-blue-500/10"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            )}
            aria-label={{
              pencil: 'Pincel',
              rect: 'Rectángulo',
              circle: 'Círculo',
              triangle: 'Triángulo',
              curve: 'Curva Bezier',
              polygon: 'Polígono',
            }[type]}
          >
            <Icon size={16} className="md:w-5 md:h-5" />
          </button>
        ))}

        <div className="hidden md:block w-10 h-0.5 bg-slate-800 rounded-full my-2" />
        <div className="block md:hidden w-0.5 h-6 bg-slate-800 rounded-full" />

        <button
          onClick={undo}
          disabled={!canUndo}
          aria-label="Deshacer"
          className={cn("w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-md", canUndo ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-900 text-slate-700 cursor-not-allowed")}
        >
          <Undo2 size={14} className="md:w-[18px] md:h-[18px]" />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          aria-label="Rehacer"
          className={cn("w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-md", canRedo ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-900 text-slate-700 cursor-not-allowed")}
        >
          <Redo2 size={14} className="md:w-[18px] md:h-[18px]" />
        </button>

        <button
          onClick={exportPNG}
          aria-label="Exportar PNG"
          className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-800 text-emerald-400 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-md"
        >
          <Download size={14} className="md:w-[18px] md:h-[18px]" />
        </button>

        <button
          onClick={handleClear}
          aria-label="Limpiar canvas"
          className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-800 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shadow-sm md:mt-auto"
        >
          <Trash2 size={16} className="md:w-5 md:h-5" />
        </button>
      </aside>

      <section className={cn("flex-1 min-h-0 min-w-0 relative overflow-hidden touch-none overscroll-none", accessibility.highContrast ? "bg-black" : "bg-slate-950")}>
        <div aria-live="polite" aria-atomic="true" className="sr-only">{liveMessage}</div>
        <div className="absolute inset-0 p-1 md:p-2">
          <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleCanvasKeyDown}
            className={cn("w-full h-full rounded-xl md:rounded-2xl overflow-hidden border touch-none overscroll-none outline-none focus:ring-4", accessibility.highContrast ? "bg-white border-white focus:ring-yellow-400" : "bg-white border-slate-800 focus:ring-blue-500/40")}
            role="application"
            aria-label="Lienzo de dibujo VozArt. Atajos: Control Z deshacer, Control Y rehacer, Delete borrar selección, G grid, L lupa, flechas mover selección, Shift más flechas mueve más rápido, más y menos zoom, 0 reinicia vista."
          >
            <canvas ref={canvasRef} className="block touch-none" />
            {showMagnifier && (
              <canvas
                ref={magnifierCanvasRef}
                className="pointer-events-none absolute rounded-full border-2 border-blue-500 shadow-xl"
                style={{
                  width: 120,
                  height: 120,
                  left: Math.min(magnifierPos.x - 60, (containerRef.current?.clientWidth || 600) - 130),
                  top: Math.min(magnifierPos.y - 60, (containerRef.current?.clientHeight || 400) - 130),
                  imageRendering: 'pixelated',
                  zIndex: 30,
                }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <div
          className={cn(
            "absolute z-20 max-w-[calc(100%-16px)] rounded-2xl border border-slate-700/80 bg-slate-950/90 p-3 shadow-2xl backdrop-blur touch-auto md:w-80 transition-transform",
            accessibility.easyRead && "scale-110 origin-top-left"
          )}
          style={{ left: panelPosition.x, top: panelPosition.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addImageFromFile(file);
              e.target.value = '';
            }}
          />
          <input
            ref={refImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addReferenceImage(file);
              e.target.value = '';
            }}
          />

          <div
            className="mb-3 flex cursor-move touch-none items-center justify-between rounded-xl bg-slate-800/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300"
            onPointerDown={startPanelDrag}
            onPointerMove={dragPanel}
            onPointerUp={stopPanelDrag}
            onPointerCancel={stopPanelDrag}
          >
            <span>Herramientas</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Move size={13} /> Mover
            </span>
          </div>

          <p className="mb-3 rounded-xl bg-slate-800/60 px-3 py-2 text-[10px] font-bold text-slate-300">
            {profileHint[workProfile]}
          </p>

          <p className={cn("mb-3 rounded-xl px-3 py-2 text-[10px] font-bold", accessibility.easyRead ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-800/40 text-slate-400")}>
            {accessibility.easyRead ? 'Modo accesible: usa Tab para enfocar el lienzo y flechas para mover la selección.' : 'Atajos: Z/Y deshacer y rehacer, G grid, 0 reset, +/- zoom.'}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {(profilePalette && profilePalette.length > 0 ? profilePalette : COLOR_SWATCHES).map((swatch) => (
              <button
                key={swatch}
                onClick={() => changeColor(swatch)}
                className={cn(
                  'h-7 w-7 rounded-full border shadow-sm transition-transform active:scale-95',
                  color === swatch ? 'border-white ring-2 ring-blue-400' : 'border-slate-600'
                )}
                style={{ backgroundColor: swatch }}
                aria-label={`Color ${swatch}`}
              />
            ))}
          <label className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400">Color</span>
            <input
              type="color"
              value={color}
              onChange={(e) => changeColor(e.target.value)}
              className="h-7 w-9 rounded-lg border border-slate-600 bg-transparent p-0.5"
              aria-label="Color personalizado"
            />
          </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <label className="grid grid-cols-[72px_1fr_28px] items-center gap-2">
              Pincel
              <input type="range" min="1" max="40" value={brushWidth} onChange={(e) => setBrushWidth(Number(e.target.value))} />
              <span className="text-right text-slate-200">{brushWidth}</span>
            </label>
            <label className="grid grid-cols-[72px_1fr_28px] items-center gap-2">
              Objeto
              <input type="range" min="40" max="260" step="10" value={objectSize} onChange={(e) => changeObjectSize(Number(e.target.value))} />
              <span className="text-right text-slate-200">{objectSize}</span>
            </label>
            <label className="grid grid-cols-[72px_1fr_28px] items-center gap-2">
              Opacidad
              <input type="range" min="0" max="1" step="0.05" value={brushOpacity} onChange={(e) => setBrushOpacity(Number(e.target.value))} />
              <span className="text-right text-slate-200">{Math.round(brushOpacity * 100)}%</span>
            </label>
            <label className="grid grid-cols-[72px_1fr_28px] items-center gap-2">
              Borde
              <input type="range" min="0" max="24" value={objectStrokeWidth} onChange={(e) => changeObjectStroke(Number(e.target.value))} />
              <span className="text-right text-slate-200">{objectStrokeWidth}</span>
            </label>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-wider">
            <button onClick={() => setBrushType('pencil')} className={cn('rounded-xl px-2 py-2', brushType === 'pencil' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Pincel</button>
            <button onClick={() => setBrushType('circle')} className={cn('rounded-xl px-2 py-2', brushType === 'circle' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Círculo</button>
            <button onClick={() => setBrushType('spray')} className={cn('rounded-xl px-2 py-2', brushType === 'spray' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Spray</button>
            <button onClick={() => setBrushType('ink')} className={cn('rounded-xl px-2 py-2', brushType === 'ink' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Tinta</button>
            <button onClick={() => setBrushType('charcoal')} className={cn('rounded-xl px-2 py-2', brushType === 'charcoal' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Carbón</button>
            <button onClick={() => setBrushType('watercolor')} className={cn('rounded-xl px-2 py-2', brushType === 'watercolor' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Acuarela</button>
            <button onClick={() => setBrushType('oil')} className={cn('rounded-xl px-2 py-2', brushType === 'oil' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Óleo</button>
            <button onClick={() => setBrushType('charcoal_pro')} className={cn('rounded-xl px-2 py-2', brushType === 'charcoal_pro' ? 'bg-stone-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Carbón+</button>
            <button onClick={() => setBrushType('watercolor_pro')} className={cn('rounded-xl px-2 py-2', brushType === 'watercolor_pro' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Acuarela+</button>
            <button onClick={() => setBrushType('spray_pro')} className={cn('rounded-xl px-2 py-2', brushType === 'spray_pro' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Spray+</button>
            <button onClick={() => setBrushType('smudge')} className={cn('rounded-xl px-2 py-2', brushType === 'smudge' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Difuminar</button>
          </div>

          <button
            onClick={() => setShowBlendPicker(prev => !prev)}
            className={cn('mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors', showBlendPicker || blendMode !== 'source-over' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}
          >
            <Blend size={12} /> {blendMode === 'source-over' ? 'Fusión' : blendMode}
          </button>
          {showBlendPicker && (
            <div className="mt-1 grid grid-cols-3 gap-1 text-[9px] font-bold">
              {BLEND_MODES.map((m) => (
                <button key={m.value} onClick={() => setCanvasBlendMode(m.value)} className={cn('rounded-lg px-1.5 py-1', blendMode === m.value ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>{m.label}</button>
              ))}
            </div>
          )}

          <button
            onClick={deleteSelectedObject}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-black text-red-300 transition-colors hover:bg-red-500 hover:text-white"
          >
            <Trash2 size={14} /> Borrar selección
          </button>

          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider">
              <button onClick={resetView} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">Reset vista</button>
              <button onClick={() => setShowGrid((prev) => !prev)} className={cn('rounded-xl px-2 py-2', showGrid ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Grid</button>
              <button onClick={() => setShowMagnifier((prev) => !prev)} className={cn('rounded-xl px-2 py-2', showMagnifier ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Lupa</button>
              <button onClick={() => setShowAnimation((prev) => !prev)} className={cn('rounded-xl px-2 py-2', showAnimation ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Anim</button>
              <button onClick={() => { const next = !snappingEnabled; setSnappingEnabled(next); snappingRef.current = next; }} className={cn('rounded-xl px-2 py-2', snappingEnabled ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Snap</button>
            </div>
            {showAnimation && (
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 space-y-2">
                <p className="text-[9px] font-bold text-slate-400">Animación del objeto seleccionado</p>
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <label className="flex items-center gap-1">
                    X: <input type="range" min={0} max={800} value={animTarget.x} onChange={(e) => setAnimTarget(p => ({ ...p, x: Number(e.target.value) }))} className="flex-1" />
                  </label>
                  <label className="flex items-center gap-1">
                    Y: <input type="range" min={0} max={600} value={animTarget.y} onChange={(e) => setAnimTarget(p => ({ ...p, y: Number(e.target.value) }))} className="flex-1" />
                  </label>
                  <label className="flex items-center gap-1">
                    Rot: <input type="range" min={-180} max={180} value={animTarget.rotation} onChange={(e) => setAnimTarget(p => ({ ...p, rotation: Number(e.target.value) }))} className="flex-1" />
                  </label>
                  <label className="flex items-center gap-1">
                    Esc: <input type="range" min={0.1} max={3} step={0.1} value={animTarget.scale} onChange={(e) => setAnimTarget(p => ({ ...p, scale: Number(e.target.value) }))} className="flex-1" />
                  </label>
                  <label className="flex items-center gap-1 col-span-2">
                    Op: <input type="range" min={0} max={1} step={0.05} value={animTarget.opacity} onChange={(e) => setAnimTarget(p => ({ ...p, opacity: Number(e.target.value) }))} className="flex-1" />
                  </label>
                </div>
                <button
                  onClick={() => playAnimation()}
                  disabled={isAnimating}
                  className="w-full rounded-xl bg-blue-600 px-2 py-2 text-[10px] font-black text-white disabled:opacity-50 hover:bg-blue-500"
                >
                  {isAnimating ? 'Animando...' : '▶ Reproducir'}
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider">
              <button onClick={() => refImageInputRef.current?.click()} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">Referencia</button>
              <button onClick={() => imageInputRef.current?.click()} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">Imagen</button>
              <button onClick={exportSVG} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">SVG</button>
              <button onClick={exportJPG} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">JPG</button>
              <button onClick={exportJSON} className="col-span-2 rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">JSON</button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 flex gap-2">
          <span className="px-1.5 md:px-2 py-0.5 bg-black/50 backdrop-blur rounded text-[8px] md:text-[9px] font-bold text-white/60">Rueda: zoom · Alt+arrastre: pan · Flechas: mover</span>
        </div>
      </section>
    </div>
  );
};
