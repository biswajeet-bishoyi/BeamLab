export interface WorkspaceSession {
  version: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  
  layout: {
    leftPanelSize: number;
    rightPanelSize: number;
    bottomPanelSize: number;
    leftPanelCollapsed: boolean;
    rightPanelCollapsed: boolean;
    activeTabs: Record<string, string>;
  };
  
  panels: {
    visibility: Record<string, boolean>;
    positions: Record<string, { x: number; y: number }>;
  };

  viewport: {
    zoom: number;
    pan: { x: number; y: number };
    theme: 'light' | 'dark' | 'system';
  };

  context: {
    selectedObjects: string[];
    recentFocus: string | null;
  };

  state: {
    archieConversationId?: string;
    timelineReplayIndex: number;
    executionGraphState?: any;
    recommendationState?: any;
  };
}

export interface WorkspacePersistence {
  saveSession(session: WorkspaceSession): Promise<void>;
  loadSession(): Promise<WorkspaceSession | null>;
  clearSession(): Promise<void>;
  migrate(session: any): Promise<WorkspaceSession>;
}

export class LocalStorageAdapter implements WorkspacePersistence {
  private readonly STORAGE_KEY = 'beamlab_workspace_session';
  private readonly CURRENT_SCHEMA_VERSION = 1;

  async saveSession(session: WorkspaceSession): Promise<void> {
    session.updatedAt = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
  }

  async loadSession(): Promise<WorkspaceSession | null> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;

    try {
      let session = JSON.parse(data);
      if (session.schemaVersion < this.CURRENT_SCHEMA_VERSION) {
        session = await this.migrate(session);
      }
      return session as WorkspaceSession;
    } catch (e) {
      console.error('Failed to parse workspace session from local storage', e);
      return null;
    }
  }

  async clearSession(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  async migrate(session: any): Promise<WorkspaceSession> {
    // Migration logic from BeamLab 1.0 -> 2.0 would go here
    session.schemaVersion = this.CURRENT_SCHEMA_VERSION;
    session.updatedAt = new Date().toISOString();
    return session as WorkspaceSession;
  }
}
