import React from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useWorkspaceStore } from '../store/workspace';
import { useStore } from '../store';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { TopNav } from './TopNav';
import { StatusBar } from './StatusBar';
import { ProjectExplorer } from './ProjectExplorer';
import { LivePropertyInspector } from '../features/inspector/LivePropertyInspector';
import { NotificationCenter } from '../features/notifications/NotificationCenter';
import { ArchieSidebar } from './ArchieSidebar';
import { CenterWorkspace } from './CenterWorkspace';

// Overlays
import { EnvironmentGallery } from '../components/environments/EnvironmentGallery';
import { AIEngineeringStudio } from '../components/AIEngineeringStudio';
import { TimeMachineOverlay } from '../components/replay/TimeMachineOverlay';
import { PresentationMode } from '../components/presentation/PresentationMode';
import { ExportStudio } from '../components/export/ExportStudio';
import { PerformanceOverlay } from '../components/PerformanceOverlay';
import { AnimatePresence } from 'framer-motion';

export const WorkspaceLayout: React.FC = () => {
  useKeyboardShortcuts();

  const leftPanelCollapsed = useWorkspaceStore(state => state.leftPanelCollapsed);
  const rightPanelCollapsed = useWorkspaceStore(state => state.rightPanelCollapsed);
  const setLeftPanelCollapsed = useWorkspaceStore(state => state.setLeftPanelCollapsed);
  const setRightPanelCollapsed = useWorkspaceStore(state => state.setRightPanelCollapsed);
  const setLeftPanelSize = useWorkspaceStore(state => state.setLeftPanelSize);
  const setRightPanelSize = useWorkspaceStore(state => state.setRightPanelSize);

  const leftSize = React.useRef(useWorkspaceStore.getState().leftPanelSize).current;
  const rightSize = React.useRef(useWorkspaceStore.getState().rightPanelSize).current;

  const {
    envGalleryOpen,
    setEnvGalleryOpen,
    aiStudioMode,
    setAiStudioOpen,
    playbackMode,
    setPlaybackMode,
    presentationMode,
    setPresentationMode,
    exportStudioOpen,
    setExportStudioOpen,
  } = useStore(state => ({
    envGalleryOpen: state.envGalleryOpen,
    setEnvGalleryOpen: state.setEnvGalleryOpen,
    aiStudioMode: state.aiStudioOpen,
    setAiStudioOpen: state.setAiStudioOpen,
    playbackMode: state.playbackMode,
    setPlaybackMode: state.setPlaybackMode,
    presentationMode: state.presentationMode,
    setPresentationMode: state.setPresentationMode,
    exportStudioOpen: state.exportStudioOpen,
    setExportStudioOpen: state.setExportStudioOpen,
  }));

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-primary overflow-hidden">
      <TopNav />
      
      <div className="flex-1 overflow-hidden relative">
        <PanelGroup orientation="horizontal">
          
          {/* Left Panel: Project Explorer */}
          {!leftPanelCollapsed && (
            <>
              <Panel 
                defaultSize={leftSize || 20} 
                minSize={15} 
                maxSize={40}
                onResize={(size) => {
                  const s = size as unknown as number;
                  setLeftPanelSize(s);
                  if (s === 0) setLeftPanelCollapsed(true);
                }}
                collapsible={true}
                className="transition-all duration-200 ease-in-out bg-[#111111]"
              >
                <PanelGroup orientation="vertical">
                  <Panel defaultSize={50} minSize={20}>
                    <ProjectExplorer />
                  </Panel>
                  <PanelResizeHandle className="h-1 bg-subtle hover:bg-accent hover:h-1.5 transition-all active:bg-accent cursor-row-resize z-10" />
                  <Panel defaultSize={50} minSize={20}>
                    <LivePropertyInspector />
                  </Panel>
                </PanelGroup>
              </Panel>
              <PanelResizeHandle className="w-1 bg-subtle hover:bg-accent hover:w-1.5 transition-all active:bg-accent cursor-col-resize z-10" />
            </>
          )}

          {/* Center: Engineering Workspace */}
          <Panel minSize={30}>
            <CenterWorkspace />
          </Panel>

          {/* Right Panel: Archie Workspace */}
          {!rightPanelCollapsed && (
            <>
              <PanelResizeHandle className="w-1 bg-subtle hover:bg-accent hover:w-1.5 transition-all active:bg-accent cursor-col-resize z-10" />
              <Panel 
                defaultSize={rightSize || 25} 
                minSize={20} 
                maxSize={50}
                onResize={(size) => {
                  const s = size as unknown as number;
                  setRightPanelSize(s);
                  if (s === 0) setRightPanelCollapsed(true);
                }}
                collapsible={true}
                className="transition-all duration-200 ease-in-out"
              >
                <ArchieSidebar />
              </Panel>
            </>
          )}

        </PanelGroup>

        {/* OVERLAYS */}
        <AnimatePresence>
          {envGalleryOpen && (
            <EnvironmentGallery onClose={() => setEnvGalleryOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {aiStudioMode && (
            <AIEngineeringStudio onClose={() => setAiStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {playbackMode && (
            <TimeMachineOverlay onClose={() => setPlaybackMode(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {presentationMode && (
            <PresentationMode onClose={() => setPresentationMode(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {exportStudioOpen && (
            <ExportStudio onClose={() => setExportStudioOpen(false)} />
          )}
        </AnimatePresence>

        <PerformanceOverlay />
      </div>

      <NotificationCenter />
      <StatusBar />
    </div>
  );
};
