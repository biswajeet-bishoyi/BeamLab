import { workspaceEventBus } from '../events/WorkspaceEventBus';
import type { SelectionState } from '../types';

export class SelectionService {
  private state: SelectionState = {
    current: [],
    history: [],
    metadata: {},
    origin: 'system'
  };

  select(entityIds: string[], origin: string = 'system', metadata: Record<string, any> = {}): void {
    if (this.state.current.length > 0) {
      this.state.history.push([...this.state.current]);
      // keep history bounded
      if (this.state.history.length > 50) this.state.history.shift();
    }

    this.state.current = [...entityIds];
    this.state.origin = origin;
    this.state.metadata = metadata;

    workspaceEventBus.emit('SelectionChanged', {
      selection: this.state.current,
      origin: this.state.origin,
      metadata: this.state.metadata
    });
  }

  clear(origin: string = 'system'): void {
    if (this.state.current.length > 0) {
      this.state.history.push([...this.state.current]);
      if (this.state.history.length > 50) this.state.history.shift();
    }
    
    this.state.current = [];
    this.state.origin = origin;
    this.state.metadata = {};

    workspaceEventBus.emit('SelectionChanged', {
      selection: [],
      origin,
      metadata: {}
    });
  }

  getSelection(): string[] {
    return [...this.state.current];
  }

  getHistory(): string[][] {
    return [...this.state.history];
  }
}

export const selectionService = new SelectionService();
