/**
 * @deprecated The Agent Memory System has been extracted to `@beamstudio/memory-client`.
 * These interfaces are provided for backward compatibility and will be removed in BeamLab v2.
 * Please use `MemoryRecord` instead of `IMemoryProvider` directly.
 */
export type { IMemoryProvider } from '@beamstudio/memory-client';

/**
 * @deprecated Use `MemoryScope` from `@beamstudio/memory-client`
 */
export interface IPrivateAgentMemory {
  agentId: string;
}

/**
 * @deprecated Use `MemoryScope` from `@beamstudio/memory-client`
 */
export interface ISharedExecutionMemory {
  executionId: string;
}

/**
 * @deprecated Use `MemoryScope` from `@beamstudio/memory-client`
 */
export interface IWorkspaceMemoryAdapter {
  workspaceId: string;
}

/**
 * @deprecated Use `MemoryScope` from `@beamstudio/memory-client`
 */
export interface IConversationMemoryAdapter {
  conversationId: string;
}

/**
 * @deprecated Use `InMemoryProvider` from `@beamstudio/memory-system`
 */
export class InMemoryProvider {
  protected store = new Map<string, any>();

  async get(key: string): Promise<any> {
    return this.store.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
