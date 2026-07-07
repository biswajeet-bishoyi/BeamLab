export interface ResourceEvent {
  id: string;
  type: 
    | 'ResourceLoaded' 
    | 'ResourceUpdated' 
    | 'ResourceRegistered' 
    | 'ResourceCached' 
    | 'ResourceRequested' 
    | 'ResourceInvalidated';
  timestamp: string;
  payload: any;
}

type EventHandler = (event: ResourceEvent) => void;

export class ResourceEventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
    
    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  emit(type: string, payload: any = {}): void {
    const event: ResourceEvent = {
      id: `revt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: type as any,
      timestamp: new Date().toISOString(),
      payload
    };

    if (this.listeners.has(type)) {
      this.listeners.get(type)!.forEach(handler => handler(event));
    }
    
    if (this.listeners.has('*')) {
      this.listeners.get('*')!.forEach(handler => handler(event));
    }
  }
}

export const resourceEventBus = new ResourceEventBus();
