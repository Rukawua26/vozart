import * as fabric from 'fabric';
import type { ToolType } from './canvas-constants';

export function makeShape(type: ToolType, color: string, size = 120, strokeWidth = 2) {
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

export function makeGridPattern() {
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

export function makeCanvasBackground(showGrid: boolean, backgroundColor: string) {
  return showGrid
    ? new fabric.Pattern({ source: makeGridPattern(), repeat: 'repeat' })
    : backgroundColor;
}

export function getImagePlacement(canvas: fabric.Canvas, img: fabric.Image, coverage = 0.8) {
  const cw = canvas.width || 512;
  const ch = canvas.height || 512;
  const scale = Math.min(cw * coverage / (img.width || cw), ch * coverage / (img.height || ch));
  return {
    scaleX: scale,
    scaleY: scale,
    left: (cw - (img.width || cw) * scale) / 2,
    top: (ch - (img.height || ch) * scale) / 2,
  };
}

export function downloadFile(filename: string, content: string, type: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.click();
  URL.revokeObjectURL(link.href);
}

export interface LayerAwareObject extends fabric.Object {
  _layer?: string;
  _baseOpacity?: number;
  name?: string;
  __uid?: string;
}
