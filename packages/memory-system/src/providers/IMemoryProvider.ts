import { MemoryRecord, MemoryScope } from '../core/MemoryRecord';

export interface IMemoryProvider {
  create(record: MemoryRecord): Promise<void>;
  load(id: string): Promise<MemoryRecord | undefined>;
  loadByOwner(ownerId: string): Promise<MemoryRecord[]>;
  save(record: MemoryRecord): Promise<void>;
  destroy(id: string): Promise<void>;
  clear(ownerId: string): Promise<void>;
}
