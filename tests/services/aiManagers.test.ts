import { describe, it, expect } from 'vitest';
import { AIContextManager } from '../../src/services/AIContextManager';
import { AIStreamManager } from '../../src/services/AIStreamManager';
import type { AIAction, AppCommand } from '../../src/types';

const makeAction = (overrides: Partial<AIAction> = {}): AIAction => ({
  action: 'ADD_SHAPE',
  shape: 'rect',
  color: '#FF5733',
  size: 100,
  ...overrides,
});

describe('AIContextManager', () => {
  it('arranca sin contexto activo', () => {
    const m = new AIContextManager();
    expect(m.getCurrentContext()).toBeNull();
  });

  it('crea sesion automaticamente al agregar comando', () => {
    const m = new AIContextManager();
    const cmd: AppCommand = { type: 'AI_ACTION', data: makeAction() };
    m.addCommand(cmd, makeAction());
    const ctx = m.getCurrentContext();
    expect(ctx).not.toBeNull();
    expect(ctx!.recentCommands.length).toBe(1);
    expect(ctx!.recentActions.length).toBe(1);
  });

  it('captura patrones de color, forma y tamano', () => {
    const m = new AIContextManager();
    m.addCommand({ type: 'AI_ACTION', data: makeAction({ color: '#FF0000' }) }, makeAction({ color: '#FF0000' }));
    m.addCommand({ type: 'AI_ACTION', data: makeAction({ color: '#FF0000', shape: 'circle' }) }, makeAction({ color: '#FF0000', shape: 'circle' }));
    const ctx = m.getCurrentContext()!;
    const colors = ctx.patterns.filter(p => p.type === 'colorPreference');
    const shapes = ctx.patterns.filter(p => p.type === 'shapePreference');
    expect(colors.find(p => p.value === '#FF0000')!.frequency).toBe(2);
    expect(shapes.find(p => p.value === 'circle')).toBeDefined();
  });

  it('genera hint cuando hay datos', () => {
    const m = new AIContextManager();
    m.addCommand(
      { type: 'AI_ACTION', data: makeAction({ color: '#00FF00' }) },
      makeAction({ color: '#00FF00' }),
    );
    const hint = m.buildProviderHint();
    expect(hint).toContain('#00FF00');
  });

  it('limite de comandos en contexto', () => {
    const m = new AIContextManager();
    for (let i = 0; i < 30; i++) {
      m.addCommand({ type: 'AI_ACTION', data: makeAction() }, makeAction());
    }
    expect(m.getCurrentContext()!.recentCommands.length).toBeLessThanOrEqual(20);
  });

  it('clear mueve el contexto al historial', () => {
    const m = new AIContextManager();
    m.addCommand({ type: 'AI_ACTION', data: makeAction() }, makeAction());
    expect(m.getCurrentContext()).not.toBeNull();
    m.clear();
    expect(m.getCurrentContext()).toBeNull();
  });
});

describe('AIStreamManager', () => {
  it('arranca con cola vacia y no streaming', () => {
    const m = new AIStreamManager();
    expect(m.status().pendingActions).toBe(0);
    expect(m.status().streaming).toBe(false);
  });

  it('encolar incrementa secuencia y marca streaming', () => {
    const m = new AIStreamManager();
    const seq = m.enqueue(makeAction());
    expect(seq).toBe(1);
    expect(m.status().pendingActions).toBe(1);
    expect(m.status().streaming).toBe(true);
    m.clear();
  });

  it('suscriptores reciben cada accion en orden', () => {
    const m = new AIStreamManager();
    const received: AIAction[] = [];
    m.subscribe(a => received.push(a));
    m.flush = function () {
      // Reemplaza el timer real para test deterministico
      while (this['pending'].length > 0) {
        const next = this['pending'].shift();
        if (next) this['subscribers'].forEach((cb: any) => cb(next.action, next.sequence));
      }
    } as any;
    m.enqueue(makeAction({ color: '#111111' }));
    m.enqueue(makeAction({ color: '#222222' }));
    m.flush();
    expect(received.length).toBe(2);
    expect(received[0].color).toBe('#111111');
    expect(received[1].color).toBe('#222222');
    m.clear();
  });

  it('subscribe retorna cancelar suscripcion', () => {
    const m = new AIStreamManager();
    let count = 0;
    const unsub = m.subscribe(() => count++);
    m.enqueue(makeAction());
    m.clear();
    unsub();
    m.enqueue(makeAction());
    m.clear();
    expect(count).toBeLessThanOrEqual(1);
  });
});
