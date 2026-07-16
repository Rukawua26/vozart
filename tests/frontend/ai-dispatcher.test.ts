// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { dispatchAIAction, type DispatchContext } from '../../src/lib/ai-dispatcher';

type CanvasMock = {
  add: ReturnType<typeof vi.fn>;
  renderAll: ReturnType<typeof vi.fn>;
  requestRenderAll: ReturnType<typeof vi.fn>;
  getObjects: ReturnType<typeof vi.fn>;
  getActiveObject: ReturnType<typeof vi.fn>;
};

function createCanvas(): CanvasMock {
  return {
    add: vi.fn(),
    renderAll: vi.fn(),
    requestRenderAll: vi.fn(),
    getObjects: vi.fn(() => []),
    getActiveObject: vi.fn(() => null),
  };
}

function createContext(canvas: CanvasMock): DispatchContext {
  return {
    canvas: canvas as unknown as DispatchContext['canvas'],
    objectStrokeWidth: 2,
    showGrid: false,
    backgroundColorRef: { current: '#ffffff' },
    saveState: vi.fn(),
    handleClear: vi.fn(),
    setLiveMessage: vi.fn(),
  };
}

describe('dispatchAIAction', () => {
  it('adds text with the action defaults', () => {
    const canvas = createCanvas();
    const context = createContext(canvas);

    dispatchAIAction({ action: 'ADD_TEXT', text: 'Hola' }, context);

    expect(canvas.add).toHaveBeenCalledTimes(1);
    expect(canvas.renderAll).toHaveBeenCalledTimes(1);
    const text = vi.mocked(canvas.add).mock.calls[0][0] as { text: string; left: number; top: number };
    expect(text.text).toBe('Hola');
    expect(text.left).toBe(200);
    expect(text.top).toBe(150);
  });

  it('clears the canvas through the provided handler', () => {
    const canvas = createCanvas();
    const context = createContext(canvas);

    dispatchAIAction({ action: 'CLEAR_CANVAS' }, context);

    expect(context.handleClear).toHaveBeenCalledOnce();
    expect(canvas.renderAll).toHaveBeenCalledOnce();
  });

  it('updates opacity on the last object and persists the state', () => {
    const object = { opacity: 1, set: vi.fn() };
    const canvas = createCanvas();
    vi.mocked(canvas.getObjects).mockReturnValue([object] as never);
    const context = createContext(canvas);

    dispatchAIAction({ action: 'SET_OPACITY', target: 'last', value: 0.4 }, context);

    expect(object.set).toHaveBeenCalledWith({ opacity: 0.4 });
    expect(canvas.requestRenderAll).toHaveBeenCalledOnce();
    expect(context.saveState).toHaveBeenCalledWith(canvas);
  });
});
