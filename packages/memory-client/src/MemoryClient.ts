import { MemoryManager, MemoryRecord, MemoryScope } from '@beamlab/memory-system';

export class MemoryClient {
  constructor(private manager: MemoryManager) {}

  public async get(scope: MemoryScope, ownerId: string, id: string): Promise<MemoryRecord | undefined> {
    return this.manager.getMemory(scope, ownerId, id);
  }

  public async getAll(scope: MemoryScope, ownerId: string): Promise<MemoryRecord[]> {
    return this.manager.getAllMemory(scope, ownerId);
  }

  public async create(
    scope: MemoryScope, 
    ownerId: string, 
    payload: any, 
    metadata?: any, 
    sessionId?: string, 
    executionId?: string
  ): Promise<MemoryRecord> {
    return this.manager.createMemory(scope, ownerId, payload, metadata, sessionId, executionId);
  }

  public async update(scope: MemoryScope, ownerId: string, record: MemoryRecord): Promise<void> {
    await this.manager.saveMemory(scope, ownerId, record);
  }

  public async delete(scope: MemoryScope, ownerId: string, id: string): Promise<void> {
    await this.manager.deleteMemory(scope, ownerId, id);
  }

  public async clear(scope: MemoryScope, ownerId: string): Promise<void> {
    await this.manager.clearMemory(scope, ownerId);
  }
}
