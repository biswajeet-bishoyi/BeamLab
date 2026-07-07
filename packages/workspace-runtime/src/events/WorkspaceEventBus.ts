import type { WorkspaceEvent } from '../types';

type EventHandler = (event: WorkspaceEvent) => void;

export class WorkspaceEventBus {
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
    const event: WorkspaceEvent = {
      id: `wevt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
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
    
    // Also emit to a global wildcard if needed
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

export const workspaceEventBus = new WorkspaceEventBus();
