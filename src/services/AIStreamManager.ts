import { AIAction, StreamStatus } from '../types';

export class AIStreamManager {
  private subscribers: ((action: AIAction, sequence: number) => void)[] = [];
  private pending: Array<{ action: AIAction; sequence: number }> = [];
  private timer: number | null = null;
  private sequence = 0;

  public enqueue(action: AIAction): number {
    this.sequence += 1;
    this.pending.push({ action, sequence: this.sequence });
    if (this.timer === null) {
      const scheduler = typeof window !== 'undefined' ? window.setInterval.bind(window) : setInterval;
      this.timer = scheduler(() => this.flush(), 800);
    }
    return this.sequence;
  }

  public subscribe(cb: (action: AIAction, sequence: number) => void): () => void {
    this.subscribers.push(cb);
    return () => {
      const i = this.subscribers.indexOf(cb);
      if (i >= 0) this.subscribers.splice(i, 1);
    };
  }

  public flush(): void {
    if (this.pending.length === 0) {
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
      return;
    }
    const next = this.pending.shift();
    if (!next) return;
    this.subscribers.forEach(cb => {
      try {
        cb(next.action, next.sequence);
      } catch (e) {
        console.warn('stream subscriber error', e);
      }
    });
  }

  public status(): StreamStatus {
    return { pendingActions: this.pending.length, streaming: this.timer !== null };
  }

  public clear(): void {
    this.pending = [];
    if (this.timer !== null) {
      const cancel = typeof window !== 'undefined' ? window.clearInterval.bind(window) : clearInterval;
      cancel(this.timer);
      this.timer = null;
    }
  }
}

export const streamManager = new AIStreamManager();
