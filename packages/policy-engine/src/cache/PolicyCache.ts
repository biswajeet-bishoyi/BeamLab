import { PolicyDecision } from '../core/PolicyModel';

export class PolicyCache {
  private cache: Map<string, { decision: PolicyDecision; timestamp: number }> = new Map();
  private ttlMs: number;

  constructor(ttlMs: number = 60000) { // Default 60 seconds
    this.ttlMs = ttlMs;
  }

  public get(key: string): PolicyDecision | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.decision;
  }

  public set(key: string, decision: PolicyDecision): void {
    this.cache.set(key, { decision, timestamp: Date.now() });
  }

  public clear(): void {
    this.cache.clear();
  }
  
  public getStats() {
    return {
      size: this.cache.size,
      ttlMs: this.ttlMs
    };
  }
}
