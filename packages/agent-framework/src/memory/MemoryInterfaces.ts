export interface IMemoryProvider {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface IPrivateAgentMemory extends IMemoryProvider {
  agentId: string;
}

export interface ISharedExecutionMemory extends IMemoryProvider {
  executionId: string;
}

export interface IWorkspaceMemoryAdapter extends IMemoryProvider {
  workspaceId: string;
}

export interface IConversationMemoryAdapter extends IMemoryProvider {
  conversationId: string;
}

/**
 * A simple in-memory implementation of the memory provider for A8.
 */
export class InMemoryProvider implements IMemoryProvider {
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
