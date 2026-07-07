import { selectionService } from '../selection/SelectionService';
import { focusEngine } from '../focus/FocusEngine';
import { workspaceEventBus } from '../events/WorkspaceEventBus';

export class WorkspaceAPI {
  // Selection
  select(entityIds: string[], metadata?: Record<string, any>): void {
    selectionService.select(entityIds, 'api', metadata);
  }

  clearSelection(): void {
    selectionService.clear('api');
  }

  getSelection(): string[] {
    return selectionService.getSelection();
  }

  getSelectionHistory(): string[][] {
    return selectionService.getHistory();
  }

  // Focus
  focus(contextId: string, relatedEntities?: string[]): void {
    focusEngine.setFocus(contextId, relatedEntities);
  }

  clearFocus(): void {
    focusEngine.clearFocus();
  }

  // Viewport/Interaction
  highlight(entityIds: string[]): void {
    workspaceEventBus.emit('HighlightRequested', { entities: entityIds });
  }

  zoomTo(entityIds: string[]): void {
    workspaceEventBus.emit('ZoomRequested', { entities: entityIds });
  }

  // Events
  on(eventType: string, handler: (event: any) => void): () => void {
    return workspaceEventBus.subscribe(eventType, handler);
  }
}

export const workspace = new WorkspaceAPI();
