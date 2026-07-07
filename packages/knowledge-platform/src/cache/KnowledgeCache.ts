import { KnowledgeItem } from '../core/KnowledgeModel';

interface CacheEntry {
  item: KnowledgeItem;
  timestamp: number;
}

export class KnowledgeCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxItems: number;
  private ttlMs: number;

  constructor(maxItems: number = 1000, ttlMs: number = 1000 * 60 * 60) {
    this.maxItems = maxItems;
    this.ttlMs = ttlMs;
  }

  set(item: KnowledgeItem): void {
    if (this.cache.size >= this.maxItems) {
      // Very basic LRU: just remove the oldest
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    this.cache.set(item.id, { item, timestamp: Date.now() });
  }

  get(id: string): KnowledgeItem | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(id);
      return null;
    }

    // Refresh timestamp
    entry.timestamp = Date.now();
    return entry.item;
  }

  invalidate(id: string): void {
    this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      maxItems: this.maxItems
    };
  }
}
