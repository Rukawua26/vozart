import { AIContext, AIAction, AppCommand, UserPattern } from '../types';

interface ContextStorage {
  current: AIContext | null;
  history: AIContext[];
  maxContexts: number;
  maxCommandsPerContext: number;
}

export class AIContextManager {
  private storage: ContextStorage;
  private callbacks: ((context: AIContext) => void)[] = [];

  constructor() {
    this.storage = {
      current: null,
      history: [],
      maxContexts: 5,
      maxCommandsPerContext: 20,
    };
  }

  public startSession(activeLayerId: string | null = null): string {
    const previous = this.storage.current;
    if (previous) {
      this.storage.history.unshift(previous);
      if (this.storage.history.length > this.storage.maxContexts) {
        this.storage.history.length = this.storage.maxContexts;
      }
    }
    const session: AIContext = {
      sessionId: this.generateSessionId(),
      recentCommands: [],
      recentActions: [],
      patterns: [],
      activeLayerId,
      sessionStartTime: Date.now(),
      lastUserInteraction: Date.now(),
    };
    this.storage.current = session;
    this.emit();
    return session.sessionId;
  }

  public addCommand(command: AppCommand, actionData?: AIAction): void {
    if (!this.storage.current) this.startSession();
    const session = this.storage.current!;
    if (typeof command === 'string') {
      session.recentCommands.push(command);
    } else {
      session.recentCommands.push(this.serialize(command));
    }
    if (actionData) session.recentActions.push(actionData);
    session.lastUserInteraction = Date.now();
    if (session.recentCommands.length > this.storage.maxCommandsPerContext) {
      session.recentCommands.shift();
    }
    if (session.recentActions.length > this.storage.maxCommandsPerContext) {
      session.recentActions.shift();
    }
    if (actionData) this.updatePatterns(actionData);
    this.emit();
  }

  private serialize(command: AppCommand): string {
    if (command.type === 'AI_ACTION') {
      const a = command.data;
      return a.prompt || a.text || a.action || 'AI_ACTION';
    }
    return command.message || 'ERROR';
  }

  private updatePatterns(action: AIAction): void {
    if (!this.storage.current) return;
    const push = (type: UserPattern['type'], value: string) => {
      const list = this.storage.current!.patterns;
      const existing = list.find(p => p.type === type && p.value === value);
      if (existing) existing.frequency += 1;
      else list.push({ type, value, frequency: 1 });
    };
    if (action.color) push('colorPreference', action.color);
    if (action.shape) push('shapePreference', action.shape);
    if (typeof action.size === 'number') push('sizePreference', String(action.size));
    if (this.storage.current.patterns.length > 40) {
      this.storage.current.patterns.sort((a, b) => b.frequency - a.frequency);
      this.storage.current.patterns.length = 30;
    }
  }

  public buildProviderHint(): string {
    const c = this.storage.current;
    if (!c) return '';
    const topColors = c.patterns.filter(p => p.type === 'colorPreference').sort((a, b) => b.frequency - a.frequency).slice(0, 3).map(p => p.value);
    const topShapes = c.patterns.filter(p => p.type === 'shapePreference').sort((a, b) => b.frequency - a.frequency).slice(0, 3).map(p => p.value);
    const recent = c.recentActions.slice(-3).map(a => a.prompt || a.action || '').filter(Boolean);
    const bits: string[] = [];
    if (recent.length) bits.push(`Acciones recientes: ${recent.join('; ')}`);
    if (topColors.length) bits.push(`Colores mas usados: ${topColors.join(', ')}`);
    if (topShapes.length) bits.push(`Formas mas usadas: ${topShapes.join(', ')}`);
    return bits.join('\n');
  }

  public getCurrentContext(): AIContext | null {
    return this.storage.current;
  }

  public clear(): void {
    if (this.storage.current) {
      this.storage.history.unshift(this.storage.current);
      this.storage.current = null;
      this.emit();
    }
  }

  public subscribe(cb: (context: AIContext) => void): () => void {
    this.callbacks.push(cb);
    return () => {
      const i = this.callbacks.indexOf(cb);
      if (i >= 0) this.callbacks.splice(i, 1);
    };
  }

  private emit(): void {
    if (this.storage.current) {
      const snapshot = this.storage.current;
      this.callbacks.forEach(cb => cb(snapshot));
    }
  }

  private generateSessionId(): string {
    return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }
}

export const contextManager = new AIContextManager();
