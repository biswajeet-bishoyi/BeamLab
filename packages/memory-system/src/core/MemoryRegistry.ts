import { MemoryRecord, MemoryScope } from './MemoryRecord';
import { IMemoryProvider } from '../providers/IMemoryProvider';

/**
 * Tracks active memory sessions and scopes to ensure isolation.
 */
export class MemoryRegistry {
  // Map of Scope -> Map of OwnerId -> IMemoryProvider
  private providers = new Map<MemoryScope, Map<string, IMemoryProvider>>();

  public registerProvider(scope: MemoryScope, ownerId: string, provider: IMemoryProvider): void {
    if (!this.providers.has(scope)) {
      this.providers.set(scope, new Map());
    }
    this.providers.get(scope)!.set(ownerId, provider);
  }

  public getProvider(scope: MemoryScope, ownerId: string): IMemoryProvider | undefined {
    return this.providers.get(scope)?.get(ownerId);
  }

  public removeProvider(scope: MemoryScope, ownerId: string): void {
    this.providers.get(scope)?.delete(ownerId);
  }

  public getAllProviders(scope: MemoryScope): Map<string, IMemoryProvider> | undefined {
    return this.providers.get(scope);
  }
}
