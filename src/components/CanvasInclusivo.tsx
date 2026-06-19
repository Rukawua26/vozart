import { useEffect, useRef, useState, useCallback, MutableRefObject } from 'react';
import * as fabric from 'fabric';
import { Pencil, Square, Circle, Triangle, Trash2, Undo2, Redo2, Download, Move } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AppCommand } from '../types';

interface CanvasApi {
  exportPNG: () => void;
}

interface CanvasProps {
  commands: AppCommand[];
  canvasApiRef: MutableRefObject<CanvasApi | null>;
}

const MAX_HISTORY = 50;
const STORAGE_KEY = 'vozart-canvas-state';

type ToolType = 'pencil' | 'rect' | 'circle' | 'triangle';

const TOOLS: { type: ToolType; icon: typeof Pencil; label: string }[] = [
  { type: 'pencil', icon: Pencil, label: 'Pincel' },
  { type: 'rect', icon: Square, label: 'Rectángulo' },
  { type: 'circle', icon: Circle, label: 'Círculo' },
  { type: 'triangle', icon: Triangle, label: 'Triángulo' },
];

const COLOR_SWATCHES = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#111827', '#FFFFFF'];

function makeShape(type: ToolType, color: string, size = 120, strokeWidth = 2) {
  const config = { left: 200, top: 150, fill: color, stroke: '#0F172A', strokeWidth, width: size, height: size };
  switch (type) {
    case 'rect': return new fabric.Rect(config);
    case 'circle': return new fabric.Circle({ ...config, radius: size / 2 });
    case 'triangle': return new fabric.Triangle(config);
    default: return null;
  }
}

export const CanvasInclusivo: React.FC<CanvasProps> = ({ commands, canvasApiRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [color, setColor] = useState('#3B82F6');
  const [brushWidth, setBrushWidth] = useState(5);
  const [objectSize, setObjectSize] = useState(120);
  const [objectStrokeWidth, setObjectStrokeWidth] = useState(2);
  const [panelPosition, setPanelPosition] = useState({ x: 8, y: 8 });
  const [showGrid, setShowGrid] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const initializedRef = useRef(false);
  const drawingRef = useRef(false);
  const pendingResizeRef = useRef(false);
  const panelDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const persistCanvas = useCallback((c: fabric.Canvas) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(c.toJSON()));
    } catch (e) {
      console.warn('No se pudo guardar el canvas:', e);
    }
  }, []);

  const saveState = useCallback((c: fabric.Canvas) => {
    const json = JSON.stringify(c.toJSON());
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
    persistCanvas(c);
  }, [persistCanvas]);

  const undo = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c || historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    c.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => c.renderAll());
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
    persistCanvas(c);
  }, [persistCanvas]);

  const redo = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    c.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => c.renderAll());
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    persistCanvas(c);
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

  const resetView = () => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    c.setViewportTransform([1, 0, 0, 1, 0, 0]);
    c.setZoom(1);
    c.requestRenderAll();
  };

  const handleClear = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    c.clear();
    c.backgroundColor = '#ffffff';
    c.renderAll();
    saveState(c);
  }, [saveState]);

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

  useEffect(() => {
    if (canvasApiRef) canvasApiRef.current = { exportPNG };
  }, [canvasApiRef, exportPNG]);

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

    c.freeDrawingBrush = new fabric.PencilBrush(c);
    c.freeDrawingBrush.color = color;
    c.freeDrawingBrush.width = brushWidth;

    c.on('object:added', () => saveState(c));
    c.on('object:modified', () => saveState(c));
    c.on('path:created', () => saveState(c));
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
      if (ev.altKey) {
        isPanning = true;
        lastPos = { x: ev.clientX, y: ev.clientY };
        c.selection = false;
      }
    });

    c.on('mouse:move', (opt) => {
      opt.e.preventDefault();
      if (!isPanning) return;
      const ev = opt.e as MouseEvent;
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
      if (pendingResizeRef.current) {
        pendingResizeRef.current = false;
        resizeCanvas(c);
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
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          c.loadFromJSON(JSON.parse(saved)).then(() => { c.renderAll(); saveState(c); });
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
      c.dispose();
    };
  }, []);

  useEffect(() => {
    if (fabricCanvasRef.current?.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.color = color;
      fabricCanvasRef.current.freeDrawingBrush.width = brushWidth;
    }
  }, [color, brushWidth]);

  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c || commands.length === 0) return;
    const last = commands[commands.length - 1];
    if (last.type !== 'AI_ACTION') return;
    const { action, shape, color: aiColor, size, prompt } = last.data;
    switch (action) {
      case 'ADD_SHAPE': {
        if (!shape) break;
        const obj = makeShape(shape as ToolType, aiColor || '#10B981', size, objectStrokeWidth);
        if (obj) c.add(obj);
        break;
      }
      case 'CHANGE_BG':
        c.backgroundColor = aiColor || '#ffffff';
        break;
      case 'CLEAR_CANVAS':
        handleClear();
        break;
      case 'GENERATE_IMAGE': {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt || 'abstract art')}?width=512&height=512&nofeed=true`;
        fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
          const cw = c.width || 512;
          const ch = c.height || 512;
          const s = Math.min(cw * 0.8 / (img.width || 512), ch * 0.8 / (img.height || 512));
          img.set({ scaleX: s, scaleY: s, left: (cw - (img.width || 512) * s) / 2, top: (ch - (img.height || 512) * s) / 2 });
          c.add(img);
          c.renderAll();
        }).catch(() => {
          c.add(new fabric.Text(`✨ ${prompt}`, { left: 100, top: 100, fontSize: 24, fill: '#334155', fontFamily: 'Outfit' }));
          c.renderAll();
        });
        break;
      }
    }
    c.renderAll();
  }, [commands, handleClear]);

  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    c.backgroundColor = showGrid
      ? new fabric.Pattern({ source: makeGridPattern(), repeat: 'repeat' })
      : '#ffffff';
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

  const syncSelectedObject = (obj?: fabric.Object) => {
    if (!obj) return;
    const selectedColor = obj.type === 'path' ? obj.stroke : obj.fill;
    if (typeof selectedColor === 'string') setColor(selectedColor);
    if (typeof obj.strokeWidth === 'number') setObjectStrokeWidth(obj.strokeWidth);
    if (obj.type === 'path' && typeof obj.strokeWidth === 'number') setBrushWidth(Math.round(obj.strokeWidth));
    if (typeof obj.width === 'number' && obj.width > 0 && obj.type !== 'path') setObjectSize(Math.round(obj.width * (obj.scaleX || 1)));
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
  };

  const changeObjectStroke = (nextWidth: number) => {
    setObjectStrokeWidth(nextWidth);
    applyToActiveObject({ stroke: '#0F172A', strokeWidth: nextWidth });
  };

  const deleteSelectedObject = () => {
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
    } else {
      c.isDrawingMode = false;
      const obj = makeShape(tool, color, objectSize, objectStrokeWidth);
      if (obj) { c.add(obj); c.setActiveObject(obj); }
    }
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col-reverse md:flex-row overflow-hidden touch-none overscroll-none">
      <aside className="h-16 md:h-full md:w-20 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex md:flex-col items-center justify-around md:justify-start md:py-6 px-2 md:px-0 md:gap-3 shrink-0">
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
            aria-label={type}
          >
            <Icon size={16} className="md:w-5 md:h-5" />
          </button>
        ))}

        <div className="hidden md:block w-10 h-0.5 bg-slate-800 rounded-full my-2" />
        <div className="block md:hidden w-0.5 h-6 bg-slate-800 rounded-full" />

        <button
          onClick={undo}
          disabled={!canUndo}
          className={cn("w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-md", canUndo ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-900 text-slate-700 cursor-not-allowed")}
        >
          <Undo2 size={14} className="md:w-[18px] md:h-[18px]" />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          className={cn("w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-md", canRedo ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-900 text-slate-700 cursor-not-allowed")}
        >
          <Redo2 size={14} className="md:w-[18px] md:h-[18px]" />
        </button>

        <button
          onClick={exportPNG}
          className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-800 text-emerald-400 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-md"
        >
          <Download size={14} className="md:w-[18px] md:h-[18px]" />
        </button>

        <button
          onClick={handleClear}
          className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-800 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shadow-sm md:mt-auto"
        >
          <Trash2 size={16} className="md:w-5 md:h-5" />
        </button>
      </aside>

      <section className="flex-1 min-h-0 min-w-0 bg-slate-950 relative overflow-hidden touch-none overscroll-none">
        <div className="absolute inset-0 p-1 md:p-2">
          <div ref={containerRef} className="w-full h-full bg-white rounded-xl md:rounded-2xl overflow-hidden border border-slate-800 touch-none overscroll-none">
            <canvas ref={canvasRef} className="block touch-none" />
          </div>
        </div>

        <div
          className="absolute z-20 max-w-[calc(100%-16px)] rounded-2xl border border-slate-700/80 bg-slate-950/90 p-3 shadow-2xl backdrop-blur touch-auto md:w-80"
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

          <div className="flex flex-wrap items-center gap-2">
            {COLOR_SWATCHES.map((swatch) => (
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
            <input
              type="color"
              value={color}
              onChange={(e) => changeColor(e.target.value)}
              className="h-7 w-9 rounded-lg border border-slate-600 bg-transparent p-0.5"
              aria-label="Color personalizado"
            />
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
              Borde
              <input type="range" min="0" max="24" value={objectStrokeWidth} onChange={(e) => changeObjectStroke(Number(e.target.value))} />
              <span className="text-right text-slate-200">{objectStrokeWidth}</span>
            </label>
          </div>

          <button
            onClick={deleteSelectedObject}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-black text-red-300 transition-colors hover:bg-red-500 hover:text-white"
          >
            <Trash2 size={14} /> Borrar selección
          </button>

          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider">
            <button onClick={resetView} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">Reset vista</button>
            <button onClick={() => setShowGrid((prev) => !prev)} className={cn('rounded-xl px-2 py-2', showGrid ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>Grid</button>
            <button onClick={() => imageInputRef.current?.click()} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">Imagen</button>
            <button onClick={exportSVG} className="rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">SVG</button>
            <button onClick={exportJSON} className="col-span-2 rounded-xl bg-slate-800 px-2 py-2 text-slate-300 hover:bg-slate-700">Exportar JSON</button>
          </div>
        </div>

        <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 flex gap-2">
          <span className="px-1.5 md:px-2 py-0.5 bg-black/50 backdrop-blur rounded text-[8px] md:text-[9px] font-bold text-white/60">Rueda: zoom · Alt+arrastre: pan</span>
        </div>
      </section>
    </div>
  );
};
