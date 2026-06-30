import * as fabric from 'fabric';

let currentPressure = 0.5;
let currentTiltX = 0;
let currentTiltY = 0;

export function setPointerProps(pressure: number, tiltX: number, tiltY: number) {
  currentPressure = pressure;
  currentTiltX = tiltX;
  currentTiltY = tiltY;
}

export function getPointerProps() {
  return { pressure: currentPressure, tiltX: currentTiltX, tiltY: currentTiltY };
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export class OilBrush extends fabric.PencilBrush {
  needsFullRender() { return true; }

  _render() {
    const ctx = this.canvas.contextTop;
    if (!ctx) return;
    const pts = this._points;
    if (pts.length < 1) return;
    ctx.save();
    ctx.fillStyle = this.color;
    const baseR = Math.max(2, this.width / 2);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const pressure = currentPressure || 0.5;
      const r = baseR * (0.6 + pressure * 0.8);
      const jitterX = rand(-r * 0.25, r * 0.25);
      const jitterY = rand(-r * 0.25, r * 0.25);
      const alpha = 0.3 + pressure * 0.5;
      ctx.globalAlpha = Math.min(1, alpha * (1 + i / pts.length * 0.3));
      ctx.beginPath();
      ctx.arc(p.x + jitterX, p.y + jitterY, r, 0, Math.PI * 2);
      ctx.fill();
      if (i > 0 && i % 3 === 0) {
        const prev = pts[i - 1];
        const mx = (prev.x + p.x) / 2;
        const my = (prev.y + p.y) / 2;
        ctx.beginPath();
        ctx.arc(mx + rand(-r * 0.2, r * 0.2), my + rand(-r * 0.2, r * 0.2), r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

export class WatercolorBrush extends fabric.PencilBrush {
  needsFullRender() { return true; }

  _render() {
    const ctx = this.canvas.contextTop;
    if (!ctx) return;
    const pts = this._points;
    if (pts.length < 1) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const baseAlpha = Math.min(0.35, 0.15 + currentPressure * 0.25);
    ctx.globalAlpha = baseAlpha;
    const baseW = Math.max(2, this.width * 1.3 + currentPressure * 4);
    ctx.lineWidth = baseW;
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      const bleed = rand(-baseW * 0.15, baseW * 0.15);
      ctx.lineTo(p.x + bleed, p.y + bleed);
    }
    ctx.stroke();
    ctx.globalAlpha = baseAlpha * 0.6;
    ctx.lineWidth = baseW * 1.4;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const bleed2 = rand(-baseW * 0.25, baseW * 0.25);
      if (i === 0) ctx.moveTo(p.x + bleed2, p.y + bleed2);
      else ctx.lineTo(p.x + bleed2, p.y + bleed2);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

export class CharcoalBrush extends fabric.PencilBrush {
  needsFullRender() { return true; }
  private _textureCanvas: HTMLCanvasElement | null = null;

  private _getTexture(): HTMLCanvasElement {
    if (this._textureCanvas) return this._textureCanvas;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const cx = c.getContext('2d')!;
    const imgData = cx.createImageData(64, 64);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() * 60 + 40;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    cx.putImageData(imgData, 0, 0);
    this._textureCanvas = c;
    return c;
  }

  _render() {
    const ctx = this.canvas.contextTop;
    if (!ctx) return;
    const pts = this._points;
    if (pts.length < 1) return;
    ctx.save();
    const pressure = currentPressure || 0.5;
    const baseW = Math.max(1, this.width * (0.5 + pressure * 0.8));
    const pattern = ctx.createPattern(this._getTexture(), 'repeat');
    if (!pattern) return;
    const alpha = Math.min(0.7, 0.25 + pressure * 0.45);
    ctx.strokeStyle = pattern;
    ctx.lineWidth = baseW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.lineWidth = baseW * 0.5;
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const jx = rand(-baseW * 0.4, baseW * 0.4);
      const jy = rand(-baseW * 0.4, baseW * 0.4);
      if (i === 0) ctx.moveTo(p.x + jx, p.y + jy);
      else ctx.lineTo(p.x + jx, p.y + jy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

export class EnhancedSprayBrush extends fabric.PencilBrush {
  needsFullRender() { return true; }
  density = 10;
  dotWidth = 2;

  _render() {
    const ctx = this.canvas.contextTop;
    if (!ctx) return;
    const pts = this._points;
    if (pts.length < 1) return;
    ctx.save();
    const pressure = currentPressure || 0.5;
    const dotW = Math.max(1, this.dotWidth || 2);
    const density = Math.round((this.density || 10) * (0.5 + pressure * 0.8));
    const spread = this.width * 0.5;
    ctx.fillStyle = this.color;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const n = Math.round(density * (0.5 + pts.length / (i + 1) * 0.3));
      for (let j = 0; j < n; j++) {
        const angle = rand(0, Math.PI * 2);
        const dist = rand(0, spread);
        const gx = dist * Math.cos(angle) - (pressure - 0.5) * dist * 0.2;
        const gy = dist * Math.sin(angle) + (1 - pressure) * dist * 0.15;
        const size = rand(dotW * 0.5, dotW * 1.5) * (0.5 + pressure * 0.6);
        ctx.globalAlpha = rand(0.3, 0.8);
        ctx.beginPath();
        ctx.arc(p.x + gx, p.y + gy, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

export class SmudgeBrush extends fabric.PencilBrush {
  needsFullRender() { return true; }

  _render() {
    const ctx = this.canvas.contextTop;
    if (!ctx) return;
    const lowerCtx = (this.canvas as any).getContext();
    if (!lowerCtx) return;
    const pts = this._points;
    if (pts.length < 2) return;
    ctx.save();
    const pressure = currentPressure || 0.5;
    const radius = Math.max(4, this.width * (0.3 + pressure * 0.5));
    for (let i = 1; i < pts.length; i++) {
      const from = pts[i - 1];
      const to = pts[i];
      for (let step = 0; step < 4; step++) {
        const t = step / 4;
        const sx = from.x + (to.x - from.x) * t;
        const sy = from.y + (to.y - from.y) * t;
        try {
          const pixel = lowerCtx.getImageData(Math.round(sx), Math.round(sy), 1, 1);
          const r = pixel.data[0], g = pixel.data[1], b = pixel.data[2], a = pixel.data[3];
          ctx.fillStyle = `rgba(${r},${g},${b},${(a / 255) * 0.35 * pressure})`;
        } catch {
          ctx.fillStyle = `rgba(128,128,128,0.15)`;
        }
        const jx = rand(-radius * 0.5, radius * 0.5);
        const jy = rand(-radius * 0.5, radius * 0.5);
        ctx.beginPath();
        ctx.arc(sx + jx, sy + jy, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

export type CustomBrushType = 'oil' | 'watercolor' | 'charcoal_pro' | 'spray_pro' | 'smudge';

export function createCustomBrush(canvas: fabric.Canvas, type: string, color: string, width: number, opacity: number): any {
  switch (type) {
    case 'oil': {
      const b = new OilBrush(canvas);
      b.color = color;
      b.width = Math.max(2, width * 1.2);
      return b;
    }
    case 'watercolor_pro': {
      const b = new WatercolorBrush(canvas);
      b.color = color;
      b.width = Math.max(2, width * 1.3);
      return b;
    }
    case 'charcoal_pro': {
      const b = new CharcoalBrush(canvas);
      b.color = color;
      b.width = Math.max(2, width * 1.7);
      return b;
    }
    case 'spray_pro': {
      const b = new EnhancedSprayBrush(canvas);
      b.color = color;
      b.dotWidth = Math.max(2, Math.round(width / 3));
      b.density = Math.max(15, Math.round(width * 3));
      b.width = Math.max(12, width * 2);
      return b;
    }
    case 'smudge': {
      const b = new SmudgeBrush(canvas);
      b.width = Math.max(4, width * 1.5);
      b.color = '#000000';
      return b;
    }
    default:
      return new fabric.PencilBrush(canvas);
  }
}
