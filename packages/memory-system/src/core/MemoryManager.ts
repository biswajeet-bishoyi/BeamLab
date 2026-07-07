import { MemoryRecord, MemoryScope } from './MemoryRecord';
import { MemoryRegistry } from './MemoryRegistry';

export class MemoryManager {
  private registry = new MemoryRegistry();

  public getRegistry(): MemoryRegistry {
    return this.registry;
  }

  public async getMemory(scope: MemoryScope, ownerId: string, id: string): Promise<MemoryRecord | undefined> {
    const provider = this.registry.getProvider(scope, ownerId);
    if (!provider) {
      throw new Error(`No memory provider registered for scope ${scope} and owner ${ownerId}`);
    }
    return provider.load(id);
  }

  public async getAllMemory(scope: MemoryScope, ownerId: string): Promise<MemoryRecord[]> {
    const provider = this.registry.getProvider(scope, ownerId);
    if (!provider) {
      return [];
    }
    return provider.loadByOwner(ownerId);
  }

  public async saveMemory(scope: MemoryScope, ownerId: string, record: MemoryRecord): Promise<void> {
    const provider = this.registry.getProvider(scope, ownerId);
    if (!provider) {
      throw new Error(`No memory provider registered for scope ${scope} and owner ${ownerId}`);
    }
    
    // Ensure memory record matches scope/owner
    if (record.scope !== scope || record.ownerId !== ownerId) {
      throw new Error(`Memory record mismatch. Expected scope ${scope} and owner ${ownerId}`);
    }

    record.updatedAt = Date.now();
    record.version += 1;

    await provider.save(record);
  }

  public async createMemory(scope: MemoryScope, ownerId: string, payload: any, metadata?: any, sessionId?: string, executionId?: string): Promise<MemoryRecord> {
    const provider = this.registry.getProvider(scope, ownerId);
    if (!provider) {
      throw new Error(`No memory provider registered for scope ${scope} and owner ${ownerId}`);
    }

    const record: MemoryRecord = {
      id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      scope,
      ownerId,
      sessionId,
      executionId,
      timestamp: Date.now(),
      updatedAt: Date.now(),
      payload,
      version: 1,
      metadata
    };

    await provider.create(record);
    return record;
  }

  public async deleteMemory(scope: MemoryScope, ownerId: string, id: string): Promise<void> {
    const provider = this.registry.getProvider(scope, ownerId);
    if (!provider) {
      throw new Error(`No memory provider registered for scope ${scope} and owner ${ownerId}`);
    }
    await provider.destroy(id);
  }

  public async clearMemory(scope: MemoryScope, ownerId: string): Promise<void> {
    const provider = this.registry.getProvider(scope, ownerId);
    if (!provider) {
      throw new Error(`No memory provider registered for scope ${scope} and owner ${ownerId}`);
    }
    await provider.clear(ownerId);
  }
}
