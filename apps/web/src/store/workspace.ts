
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    { name: 'beamlab-workspace-storage' }
  )
);
