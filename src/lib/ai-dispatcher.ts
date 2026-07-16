import * as fabric from 'fabric';
import type { AIAction } from '../types';
import type { ToolType } from './canvas-constants';
import { makeShape, makeCanvasBackground, getImagePlacement } from './canvas-utils';

export interface DispatchContext {
  canvas: fabric.Canvas;
  objectStrokeWidth: number;
  showGrid: boolean;
  backgroundColorRef: { current: string };
  saveState: (c: fabric.Canvas) => void;
  handleClear: () => void;
  setLiveMessage: (msg: string) => void;
}

export function dispatchAIAction(action: AIAction, ctx: DispatchContext): void {
  const { canvas: c, objectStrokeWidth, showGrid, backgroundColorRef, saveState, handleClear, setLiveMessage } = ctx;
  const d = action;
  switch (d.action) {
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
      c.backgroundColor = makeCanvasBackground(showGrid, backgroundColorRef.current);
      saveState(c);
      break;
    case 'CLEAR_CANVAS':
      handleClear();
      break;
    case 'GENERATE_IMAGE': {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(d.prompt || 'abstract art')}?width=512&height=512&nofeed=true`;
      fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
        img.set(getImagePlacement(c, img));
        c.add(img);
        c.renderAll();
      }).catch((e) => {
        console.warn('Failed to generate image:', e);
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
            ? (sel as fabric.ActiveSelection).getObjects()
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
            ? (sel as fabric.ActiveSelection).getObjects()
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
      const sceneActions: AIAction[] = d.actions || [];
      (sceneActions || []).forEach((sa: AIAction, si: number) => {
        setTimeout(() => {
          if (sa.action === 'GENERATE_IMAGE' && sa.prompt) {
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(sa.prompt)}?width=512&height=512&nofeed=true`;
            fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
              img.set({ ...getImagePlacement(c, img), opacity: 0 });
              c.add(img);
              img.animate({ opacity: 1 }, { duration: 800, onChange: () => c.requestRenderAll() });
            }).catch((e) => {
              console.warn('STORY_SCENE image failed:', e);
            });
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
            c.backgroundColor = makeCanvasBackground(showGrid, backgroundColorRef.current);
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
}
