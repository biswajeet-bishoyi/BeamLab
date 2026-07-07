import { selectionService } from '../selection/SelectionService';
import { focusEngine } from '../focus/FocusEngine';
import { workspaceEventBus } from '../events/WorkspaceEventBus';
import { CommandRegistry } from '../commands/CommandRegistry';
import { NotificationService } from '../notifications/NotificationService';
import { WorkspaceHealthService } from '../health/WorkspaceHealth';
import { LocalStorageAdapter, WorkspacePersistence } from '../session/WorkspacePersistence';
import { ProfileManager } from '../session/WorkspaceProfiles';

export class WorkspaceAPI {
  public commands: CommandRegistry;
  public notifications: NotificationService;
  public health: WorkspaceHealthService;
  public session: WorkspacePersistence;
  public profiles: ProfileManager;

  constructor() {
    this.commands = new CommandRegistry(workspaceEventBus);
    this.notifications = new NotificationService(workspaceEventBus);
    this.health = new WorkspaceHealthService(workspaceEventBus);
    this.session = new LocalStorageAdapter();
    this.profiles = new ProfileManager();
    
    // Start monitoring health
    this.health.startMonitoring();
  }

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
