
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { workspace } from '@beamlab/workspace-runtime';

interface WorkspaceState {
  leftPanelCollapsed: boolean;
  leftPanelSize: number;
  rightPanelCollapsed: boolean;
  rightPanelSize: number;
  activeArchieTab: string;
  theme: 'light' | 'dark' | 'system';
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setLeftPanelSize: (size: number) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelSize: (size: number) => void;
  setActiveArchieTab: (tab: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const workspaceStorage: StateStorage = {
  getItem: async (_name: string): Promise<string | null> => {
    const session = await workspace.session.loadSession();
    if (!session) return null;
    return JSON.stringify({ state: session.layout });
  },
  setItem: async (_name: string, value: string): Promise<void> => {
    const parsed = JSON.parse(value);
    const state = parsed.state;
    const currentSession = await workspace.session.loadSession() || {
      version: '1.0',
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      layout: state,
      panels: { visibility: {}, positions: {} },
      viewport: { zoom: 1, pan: { x: 0, y: 0 }, theme: 'system' },
      context: { selectedObjects: [], recentFocus: null },
      state: { timelineReplayIndex: 0 }
    };
    currentSession.layout = state;
    await workspace.session.saveSession(currentSession);
  },
  removeItem: async (_name: string): Promise<void> => {
    await workspace.session.clearSession();
  },
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      leftPanelCollapsed: false,
      leftPanelSize: 20,
      rightPanelCollapsed: false,
      rightPanelSize: 25,
      activeArchieTab: 'chat',
      theme: 'system',
      setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),
      setLeftPanelSize: (size) => set({ leftPanelSize: size }),
      setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),
      setRightPanelSize: (size) => set({ rightPanelSize: size }),
      setActiveArchieTab: (tab) => set({ activeArchieTab: tab }),
      setTheme: (theme) => set({ theme }),
    }),
    { 
      name: 'beamlab-workspace-storage',
      storage: createJSONStorage(() => workspaceStorage)
    }
  )
);
