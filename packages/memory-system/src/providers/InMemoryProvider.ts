import { MemoryRecord } from '../core/MemoryRecord';
import { IMemoryProvider } from './IMemoryProvider';

export class InMemoryProvider implements IMemoryProvider {
  private store = new Map<string, MemoryRecord>();

  async create(record: MemoryRecord): Promise<void> {
    if (this.store.has(record.id)) {
      throw new Error(`Memory with ID ${record.id} already exists`);
    }
    this.store.set(record.id, record);
  }

  async load(id: string): Promise<MemoryRecord | undefined> {
    return this.store.get(id);
  }

  async loadByOwner(ownerId: string): Promise<MemoryRecord[]> {
    return Array.from(this.store.values()).filter(r => r.ownerId === ownerId);
  }

  async save(record: MemoryRecord): Promise<void> {
    this.store.set(record.id, record);
  }

  async destroy(id: string): Promise<void> {
    this.store.delete(id);
  }

  async clear(ownerId: string): Promise<void> {
    for (const [id, record] of this.store.entries()) {
      if (record.ownerId === ownerId) {
        this.store.delete(id);
      }
    }
  }
}
