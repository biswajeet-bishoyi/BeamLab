import { Resource } from '../core/ResourceModel';

export class ResourceCache {
  private cache: Map<string, { resource: Resource<any>; timestamp: number }> = new Map();
  private ttlMs: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(ttlMs: number = 300000) { // 5 minutes default
    this.ttlMs = ttlMs;
  }

  public get(id: string): Resource<any> | null {
    const entry = this.cache.get(id);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(id);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.resource;
  }

  public set(resource: Resource<any>): void {
    this.cache.set(resource.id, { resource, timestamp: Date.now() });
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0
    };
  }
}
