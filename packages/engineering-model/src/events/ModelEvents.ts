/**
 * Canonical Engineering Model Events.
 * Published whenever the model changes. Consumers (Workspace, Agents, etc.)
 * subscribe to these events without knowing about each other.
 */

export type CEMEventType =
  | 'EngineeringObjectCreated'
  | 'EngineeringObjectUpdated'
  | 'EngineeringObjectDeleted'
  | 'RelationshipCreated'
  | 'RelationshipRemoved'
  | 'ValidationCompleted'
  | 'VersionChanged'
  | 'StructureAdded'
  | 'ModelLoaded'
  | 'ModelCleared';

export interface CEMEvent<T = unknown> {
  readonly type: CEMEventType;
  readonly timestamp: string;
  readonly modelId: string;
  readonly objectId?: string;
  readonly payload: T;
}

/** Type-safe event emitter for the engineering model */
export class CEMEventEmitter {
  private readonly _listeners: Map<CEMEventType, Array<(event: CEMEvent) => void>> = new Map();

  public on(type: CEMEventType, handler: (event: CEMEvent) => void): () => void {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type)!.push(handler);
    return () => this.off(type, handler);
  }

  public off(type: CEMEventType, handler: (event: CEMEvent) => void): void {
    const handlers = this._listeners.get(type);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  }

  public emit<T>(event: CEMEvent<T>): void {
    this._listeners.get(event.type)?.forEach(h => h(event));
    // Also fire wildcard listeners if registered
    this._listeners.get('ModelLoaded')?.forEach(() => {}); // no-op but keep pattern
  }
}
