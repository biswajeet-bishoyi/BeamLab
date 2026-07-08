import { IEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';

/**
 * Central lookup registry for all engineering objects.
 * Provides O(1) access by ID and type-filtered collection access.
 */
export class ObjectRegistry {
  private readonly _store: Map<string, IEngineeringObject> = new Map();
  private readonly _byType: Map<EngineeringObjectType, Set<string>> = new Map();

  public register(obj: IEngineeringObject): void {
    this._store.set(obj.identity.id, obj);
    if (!this._byType.has(obj.objectType)) {
      this._byType.set(obj.objectType, new Set());
    }
    this._byType.get(obj.objectType)!.add(obj.identity.id);
  }

  public unregister(id: string): void {
    const obj = this._store.get(id);
    if (obj) {
      this._byType.get(obj.objectType)?.delete(id);
      this._store.delete(id);
    }
  }

  public get(id: string): IEngineeringObject | undefined {
    return this._store.get(id);
  }

  public getByType<T extends IEngineeringObject>(type: EngineeringObjectType): T[] {
    const ids = this._byType.get(type) ?? new Set();
    return Array.from(ids)
      .map(id => this._store.get(id) as T)
      .filter(Boolean);
  }

  public has(id: string): boolean {
    return this._store.has(id);
  }

  public all(): IEngineeringObject[] {
    return Array.from(this._store.values());
  }

  public size(): number {
    return this._store.size;
  }

  public clear(): void {
    this._store.clear();
    this._byType.clear();
  }
}
