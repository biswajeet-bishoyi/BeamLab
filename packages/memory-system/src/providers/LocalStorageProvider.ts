import { MemoryRecord } from '../core/MemoryRecord';
import { IMemoryProvider } from './IMemoryProvider';

export class LocalStorageProvider implements IMemoryProvider {
  constructor(private namespace: string) {}

  private getStorageKey(id: string): string {
    return `${this.namespace}:${id}`;
  }

  private getAllKeys(): string[] {
    if (typeof localStorage === 'undefined') return [];
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.namespace}:`)) {
        keys.push(key);
      }
    }
    return keys;
  }

  async create(record: MemoryRecord): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    const key = this.getStorageKey(record.id);
    if (localStorage.getItem(key)) {
      throw new Error(`Memory with ID ${record.id} already exists`);
    }
    localStorage.setItem(key, JSON.stringify(record));
  }

  async load(id: string): Promise<MemoryRecord | undefined> {
    if (typeof localStorage === 'undefined') return undefined;
    const data = localStorage.getItem(this.getStorageKey(id));
    return data ? JSON.parse(data) : undefined;
  }

  async loadByOwner(ownerId: string): Promise<MemoryRecord[]> {
    const keys = this.getAllKeys();
    const records: MemoryRecord[] = [];
    for (const key of keys) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const record = JSON.parse(data) as MemoryRecord;
          if (record.ownerId === ownerId) {
            records.push(record);
          }
        } catch (e) {
          // skip invalid json
        }
      }
    }
    return records;
  }

  async save(record: MemoryRecord): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.getStorageKey(record.id), JSON.stringify(record));
  }

  async destroy(id: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.getStorageKey(id));
  }

  async clear(ownerId: string): Promise<void> {
    const records = await this.loadByOwner(ownerId);
    if (typeof localStorage === 'undefined') return;
    for (const record of records) {
      localStorage.removeItem(this.getStorageKey(record.id));
    }
  }
}
