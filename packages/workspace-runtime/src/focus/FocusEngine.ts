import { workspaceEventBus } from '../events/WorkspaceEventBus';
import type { FocusState } from '../types';

export class FocusEngine {
  private state: FocusState = {
    contextId: null,
    relatedEntities: []
  };

  constructor() {
    // Automatically update focus when selection changes
    workspaceEventBus.subscribe('SelectionChanged', (event) => {
      const { selection } = event.payload;
      if (selection && selection.length > 0) {
        this.setFocus(selection[0], selection.slice(1));
      } else {
        this.clearFocus();
      }
    });
  }

  setFocus(contextId: string, relatedEntities: string[] = []): void {
    this.state.contextId = contextId;
    this.state.relatedEntities = [...relatedEntities];
    
    workspaceEventBus.emit('FocusChanged', {
      focus: this.state
    });
  }

  clearFocus(): void {
    this.state.contextId = null;
    this.state.relatedEntities = [];
    
    workspaceEventBus.emit('FocusChanged', {
      focus: this.state
    });
  }

  getFocus(): FocusState {
    return { ...this.state };
  }
}

export const focusEngine = new FocusEngine();
