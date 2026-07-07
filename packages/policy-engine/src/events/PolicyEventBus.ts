export interface PolicyEvent {
  id: string;
  type: 
    | 'PolicyLoaded' 
    | 'PolicyUpdated' 
    | 'PolicyEvaluated' 
    | 'PolicyApproved' 
    | 'PolicyDenied' 
    | 'PolicyExpired' 
    | 'PolicyInvalidated';
  timestamp: string;
  payload: any;
}

type EventHandler = (event: PolicyEvent) => void;

export class PolicyEventBus {
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
    const event: PolicyEvent = {
      id: `pevt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: type as any,
      timestamp: new Date().toISOString(),
      payload
    };

    if (this.listeners.has(type)) {
      this.listeners.get(type)!.forEach(handler => {
        try {
          handler(event);
        } catch (e) {
          console.error(`Error in event handler for ${type}:`, e);
        }
      });
    }
    
    if (this.listeners.has('*')) {
      this.listeners.get('*')!.forEach(handler => {
        try {
          handler(event);
        } catch (e) {
          console.error(`Error in wildcard event handler for ${type}:`, e);
        }
      });
    }
  }
}

export const policyEventBus = new PolicyEventBus();
