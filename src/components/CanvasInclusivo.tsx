import React, { useEffect, useRef, useState, useCallback, MutableRefObject } from 'react';
import * as fabric from 'fabric';
import { Pencil, Square, Circle, Triangle, Trash2, Undo2, Redo2, Download } from 'lucide-react';
import { cn } from '../lib/utils';

interface CanvasApi {
  exportPNG: () => void;
}

interface CanvasProps {
  onActionExecute?: (action: any) => void;
  commands: any[];
  canvasApiRef: MutableRefObject<CanvasApi | null>;
}

const MAX_HISTORY = 50;

export const CanvasInclusivo: React.FC<CanvasProps> = ({ commands, canvasApiRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'pencil' | 'rect' | 'circle' | 'triangle'>('pencil');
  const [color, setColor] = useState('#3B82F6');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const saveState = useCallback((c: fabric.Canvas) => {
    const json = JSON.stringify(c.toJSON());
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (!fabricCanvas || historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const state = JSON.parse(historyRef.current[historyIndexRef.current]);
    fabricCanvas.loadFromJSON(state).then(() => fabricCanvas.renderAll());
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, [fabricCanvas]);

  const redo = useCallback(() => {
    if (!fabricCanvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const state = JSON.parse(historyRef.current[historyIndexRef.current]);
    fabricCanvas.loadFromJSON(state).then(() => fabricCanvas.renderAll());
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [fabricCanvas]);

  const exportPNG = useCallback(() => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = `vozart-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }, [fabricCanvas]);

  useEffect(() => {
    if (canvasApiRef) canvasApiRef.current = { exportPNG };
  }, [canvasApiRef, exportPNG]);

  const resizeCanvas = useCallback((c: fabric.Canvas) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    c.setDimensions({ width: w, height: h });
    c.renderAll();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const c = new fabric.Canvas(canvasRef.current, {
      width: Math.floor(rect.width),
      height: Math.floor(rect.height),
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });

    c.freeDrawingBrush = new fabric.PencilBrush(c);
    c.freeDrawingBrush.color = color;
    c.freeDrawingBrush.width = 5;

    c.on('object:added', () => saveState(c));
    c.on('object:modified', () => saveState(c));
    c.on('path:created', () => saveState(c));

    c.on('mouse:wheel', (opt) => {
      const ev = opt.e as WheelEvent;
      const delta = ev.deltaY;
      let zoom = c.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      const pt = new fabric.Point(ev.offsetX, ev.offsetY);
      c.zoomToPoint(pt, zoom);
      ev.preventDefault();
      ev.stopPropagation();
    });

    let isPanning = false;
    let lastPos = { x: 0, y: 0 };

    c.on('mouse:down', (opt) => {
      const ev = opt.e as MouseEvent;
      if (ev.altKey) {
        isPanning = true;
        lastPos = { x: ev.clientX, y: ev.clientY };
        c.selection = false;
      }
    });

    c.on('mouse:move', (opt) => {
      if (isPanning) {
        const ev = opt.e as MouseEvent;
        const vpt = c.viewportTransform!;
        vpt[4] += ev.clientX - lastPos.x;
        vpt[5] += ev.clientY - lastPos.y;
        c.requestRenderAll();
        lastPos = { x: ev.clientX, y: ev.clientY };
      }
    });

    c.on('mouse:up', () => {
      isPanning = false;
      c.selection = true;
    });

    const ro = new ResizeObserver(() => resizeCanvas(c));
    ro.observe(containerRef.current);

    saveState(c);

    setFabricCanvas(c);
    return () => {
      ro.disconnect();
      c.dispose();
    };
  }, []);

  useEffect(() => {
    if (fabricCanvas?.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = color;
    }
  }, [color, fabricCanvas]);

  const handleClear = useCallback(() => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.set({ backgroundColor: '#ffffff' });
    fabricCanvas.renderAll();
    saveState(fabricCanvas);
  }, [fabricCanvas, saveState]);

  useEffect(() => {
    if (!fabricCanvas || commands.length === 0) return;
    const lastCommand = commands[commands.length - 1];
    if (lastCommand.type === 'AI_ACTION') {
      const { action, shape, color: aiColor, size, prompt } = lastCommand.data;
      switch (action) {
        case 'ADD_SHAPE': {
          let obj;
          const config = { left: 150, top: 150, fill: aiColor || '#10B981', width: size || 100, height: size || 100 };
          if (shape === 'rect') obj = new fabric.Rect(config);
          if (shape === 'circle') obj = new fabric.Circle({ ...config, radius: (size || 100) / 2 });
          if (shape === 'triangle') obj = new fabric.Triangle(config);
          if (obj) fabricCanvas.add(obj);
          break;
        }
        case 'CHANGE_BG':
          fabricCanvas.set({ backgroundColor: aiColor || '#ffffff' });
          break;
        case 'CLEAR_CANVAS':
          handleClear();
          break;
        case 'GENERATE_IMAGE': {
          const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt || 'abstract art')}?width=512&height=512&nofeed=true`;
          fabric.Image.fromURL(imgUrl, { crossOrigin: 'anonymous' }).then((img) => {
            const canvasW = fabricCanvas.width || 512;
            const canvasH = fabricCanvas.height || 512;
            const scale = Math.min(canvasW * 0.8 / (img.width || 512), canvasH * 0.8 / (img.height || 512));
            img.set({ scaleX: scale, scaleY: scale, left: (canvasW - (img.width || 512) * scale) / 2, top: (canvasH - (img.height || 512) * scale) / 2 });
            fabricCanvas.add(img);
            fabricCanvas.renderAll();
          }).catch(() => {
            const fallback = new fabric.Text(`✨ ${prompt}`, { left: 100, top: 100, fontSize: 24, fill: '#334155', fontFamily: 'Outfit' });
            fabricCanvas.add(fallback);
            fabricCanvas.renderAll();
          });
          break;
        }
      }
      fabricCanvas.renderAll();
    }
  }, [commands, fabricCanvas, handleClear]);

  const toggleDrawing = (tool: 'pencil' | 'rect' | 'circle' | 'triangle') => {
    if (!fabricCanvas) return;
    setActiveTool(tool);
    fabricCanvas.isDrawingMode = tool === 'pencil';
  };

  const addShape = (type: 'rect' | 'circle' | 'triangle') => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = false;
    setActiveTool(type);
    const config = { left: 200, top: 150, fill: color, width: 120, height: 120 };
    let obj;
    if (type === 'rect') obj = new fabric.Rect(config);
    if (type === 'circle') obj = new fabric.Circle({ ...config, radius: 60 });
    if (type === 'triangle') obj = new fabric.Triangle(config);
    if (obj) { fabricCanvas.add(obj); fabricCanvas.setActiveObject(obj); }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-3 shrink-0">
        <button
          onClick={() => toggleDrawing('pencil')}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md group",
            activeTool === 'pencil' ? "bg-blue-600 text-white shadow-blue-500/20 ring-4 ring-blue-500/10" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          )}
        >
          <Pencil size={20} />
        </button>

        <button
          onClick={() => addShape('rect')}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md group",
            activeTool === 'rect' ? "bg-blue-600 text-white shadow-blue-500/20 ring-4 ring-blue-500/10" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          )}
        >
          <Square size={20} />
        </button>

        <button
          onClick={() => addShape('circle')}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md group",
            activeTool === 'circle' ? "bg-blue-600 text-white shadow-blue-500/20 ring-4 ring-blue-500/10" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          )}
        >
          <Circle size={20} />
        </button>

        <button
          onClick={() => addShape('triangle')}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md group",
            activeTool === 'triangle' ? "bg-blue-600 text-white shadow-blue-500/20 ring-4 ring-blue-500/10" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          )}
        >
          <Triangle size={20} />
        </button>

        <div className="w-10 h-0.5 bg-slate-800 rounded-full my-2" />

        <button
          onClick={undo}
          disabled={!canUndo}
          className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md", canUndo ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-900 text-slate-700 cursor-not-allowed")}
        >
          <Undo2 size={18} />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md", canRedo ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-900 text-slate-700 cursor-not-allowed")}
        >
          <Redo2 size={18} />
        </button>

        <button
          onClick={exportPNG}
          className="w-12 h-12 rounded-2xl bg-slate-800 text-emerald-400 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-md"
        >
          <Download size={18} />
        </button>

        <button
          onClick={handleClear}
          className="w-12 h-12 rounded-2xl bg-slate-800 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shadow-sm mt-auto"
        >
          <Trash2 size={20} />
        </button>
      </aside>

      <section className="flex-1 bg-slate-950 relative flex flex-col items-center justify-center overflow-hidden">
        <div className="flex-1 w-full p-2">
          <div ref={containerRef} className="w-full h-full bg-white rounded-2xl overflow-hidden border border-slate-800">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex gap-2">
          <span className="px-2 py-0.5 bg-black/50 backdrop-blur rounded text-[9px] font-bold text-white/60">Rueda: zoom · Alt+arrastre: pan</span>
        </div>
      </section>
    </div>
  );
};
