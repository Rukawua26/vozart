import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { Pencil, Square, Circle, Triangle, Trash2, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

interface CanvasProps {
  onActionExecute?: (action: any) => void;
  commands: any[];
}

export const CanvasInclusivo: React.FC<CanvasProps> = ({ commands }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'pencil' | 'rect' | 'circle' | 'triangle'>('pencil');
  const [color, setColor] = useState('#3B82F6');

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

    const ro = new ResizeObserver(() => resizeCanvas(c));
    ro.observe(containerRef.current);

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
  }, [fabricCanvas]);

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
      <aside className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6 shrink-0">
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

        <div className="flex flex-col gap-3 mt-auto mb-4">
          <button onClick={() => setColor('#EF4444')} className={cn("w-8 h-8 rounded-full bg-red-500 cursor-pointer border-2 transition-all", color === '#EF4444' ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60")} />
          <button onClick={() => setColor('#10B981')} className={cn("w-8 h-8 rounded-full bg-emerald-500 cursor-pointer border-2 transition-all", color === '#10B981' ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60")} />
          <button onClick={() => setColor('#FBBF24')} className={cn("w-8 h-8 rounded-full bg-yellow-400 cursor-pointer border-2 transition-all", color === '#FBBF24' ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60")} />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-none overflow-hidden"
          />
        </div>

        <button
          onClick={handleClear}
          className="w-12 h-12 bg-slate-800 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm"
        >
          <Trash2 size={20} />
        </button>
      </aside>

      <section className="flex-1 bg-slate-950 relative flex flex-col items-center justify-center p-8 overflow-hidden">
        <div className="w-full max-w-4xl bg-slate-900 rounded-[2.5rem] p-3 border border-slate-800 shadow-2xl relative">
          <div className="absolute top-8 left-8 flex gap-2 z-10">
            <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">Base IA</span>
            <span className="px-3 py-1 bg-blue-500/80 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest">Manual</span>
          </div>

          <div ref={containerRef} className="canvas-outline rounded-[2rem] overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="absolute left-12 bottom-12 hidden 2xl:flex flex-col gap-2 scale-90">
             <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4 w-48 shadow-xl">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                  <Layers size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Guardado</p>
                  <p className="text-xs font-semibold text-white">Versión 1.0</p>
                </div>
             </div>
        </div>
      </section>
    </div>
  );
};
