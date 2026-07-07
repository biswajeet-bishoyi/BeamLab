import { WorkspaceSession } from './WorkspacePersistence';

export type WorkspaceProfileType = 
  | 'Structural Analysis'
  | 'Steel Design'
  | 'Concrete Design'
  | 'Reporting'
  | 'Review'
  | 'Teaching'
  | 'Research'
  | 'Presentation'
  | 'Custom';

export interface WorkspaceProfile {
  id: string;
  type: WorkspaceProfileType;
  name: string;
  description?: string;
  
  config: {
    panelLayout: Partial<WorkspaceSession['layout']>;
    shortcuts: Record<string, string>;
    archieConfiguration: any;
    visibleTools: string[];
    workspaceSettings: any;
  };
}

export class ProfileManager {
  private profiles: Map<string, WorkspaceProfile> = new Map();
  private activeProfileId: string | null = null;

  constructor() {
    this.initializeDefaultProfiles();
  }

  private initializeDefaultProfiles() {
    // Add default engineering profiles
    this.profiles.set('profile-structural', {
      id: 'profile-structural',
      type: 'Structural Analysis',
      name: 'Structural Analysis Default',
      config: {
        panelLayout: { leftPanelSize: 20, rightPanelSize: 30 },
        shortcuts: {},
        archieConfiguration: { mode: 'expert' },
        visibleTools: ['inspect', 'analyze', 'forces'],
        workspaceSettings: { theme: 'system' }
      }
    });

    this.profiles.set('profile-steel', {
      id: 'profile-steel',
      type: 'Steel Design',
      name: 'Steel Design Default',
      config: {
        panelLayout: { leftPanelSize: 25, rightPanelSize: 25 },
        shortcuts: {},
        archieConfiguration: { mode: 'design' },
        visibleTools: ['inspect', 'check-code', 'optimize'],
        workspaceSettings: { theme: 'system' }
      }
    });
  }

  getProfiles(): WorkspaceProfile[] {
    return Array.from(this.profiles.values());
  }

  getActiveProfile(): WorkspaceProfile | null {
    if (!this.activeProfileId) return null;
    return this.profiles.get(this.activeProfileId) || null;
  }

  setActiveProfile(id: string): void {
    if (this.profiles.has(id)) {
      this.activeProfileId = id;
      // In a real implementation, this would trigger an event to reload the workspace config
    }
  }
}
