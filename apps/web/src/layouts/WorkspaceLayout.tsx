import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useWorkspaceStore } from '../store/workspace';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
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
import { ArchieCopilotStudio } from '../features/copilot/ArchieCopilotStudio';
import { TimeMachineOverlay } from '../components/replay/TimeMachineOverlay';
import { PresentationMode } from '../components/presentation/PresentationMode';
import { ExportStudio } from '../components/export/ExportStudio';
import { PerformanceOverlay } from '../components/PerformanceOverlay';
import { DesignCodeInspectorStudio } from '../features/knowledge';
import { CollaborationSessionStudio } from '../features/collaboration';
import { SteelConnectionStudio } from '../features/connections';
import { ConcreteDesignStudio } from '../features/concrete';
import { BIMInteropStudio } from '../features/interop';
import { FoundationStudio } from '../features/foundation';
import { SeismicStudio } from '../features/seismic';
import { WindStudio } from '../features/wind';
import { TimberStudio } from '../features/timber';
import { CompositeStudio } from '../features/composite';
import { PrestressedStudio } from '../features/prestressed';
import { BridgeStudio } from '../features/bridge';
import { CableStudio } from '../features/cable';
import { PlateShellStudio } from '../features/fem';
import { EarthStudio } from '../features/earth';
import { BlastStudio } from '../features/blast';
import { SolveFarmStudio } from '../features/farm/SolveFarmStudio';
import { AddBeamModal } from '../components/modeling/AddBeamModal';
import { AnimatePresence } from 'framer-motion';

export const WorkspaceLayout: React.FC = () => {
  useKeyboardShortcuts();

  const leftPanelCollapsed = useWorkspaceStore(state => state.leftPanelCollapsed);
  const rightPanelCollapsed = useWorkspaceStore(state => state.rightPanelCollapsed);
  const setLeftPanelCollapsed = useWorkspaceStore(state => state.setLeftPanelCollapsed);
  const setRightPanelCollapsed = useWorkspaceStore(state => state.setRightPanelCollapsed);
  const setLeftPanelSize = useWorkspaceStore(state => state.setLeftPanelSize);
  const setRightPanelSize = useWorkspaceStore(state => state.setRightPanelSize);

  const rawLeft = useWorkspaceStore.getState().leftPanelSize;
  const leftSize = React.useRef(
    typeof rawLeft === 'number' && !isNaN(rawLeft) && rawLeft > 0
      ? rawLeft
      : (rawLeft && typeof rawLeft === 'object' && typeof (rawLeft as any).asPercentage === 'number'
          ? (rawLeft as any).asPercentage
          : 20)
  ).current;

  const rawRight = useWorkspaceStore.getState().rightPanelSize;
  const rightSize = React.useRef(
    typeof rawRight === 'number' && !isNaN(rawRight) && rawRight > 0
      ? rawRight
      : (rawRight && typeof rawRight === 'object' && typeof (rawRight as any).asPercentage === 'number'
          ? (rawRight as any).asPercentage
          : 25)
  ).current;

  const {
    envGalleryOpen,
    setEnvGalleryOpen,
    aiStudioMode,
    setAiStudioOpen,
    copilotStudioOpen,
    setCopilotStudioOpen,
    playbackMode,
    setPlaybackMode,
    presentationMode,
    setPresentationMode,
    exportStudioOpen,
    setExportStudioOpen,
    codeStudioOpen,
    setCodeStudioOpen,
    collaborationStudioOpen,
    setCollaborationStudioOpen,
    connectionStudioOpen,
    setConnectionStudioOpen,
    concreteStudioOpen,
    setConcreteStudioOpen,
    bimInteropStudioOpen,
    setBimInteropStudioOpen,
    foundationStudioOpen,
    setFoundationStudioOpen,
    seismicStudioOpen,
    setSeismicStudioOpen,
    windStudioOpen,
    setWindStudioOpen,
    timberStudioOpen,
    setTimberStudioOpen,
    compositeStudioOpen,
    setCompositeStudioOpen,
    prestressedStudioOpen,
    setPrestressedStudioOpen,
    bridgeStudioOpen,
    setBridgeStudioOpen,
    cableStudioOpen,
    setCableStudioOpen,
    plateShellStudioOpen,
    setPlateShellStudioOpen,
    earthStudioOpen,
    setEarthStudioOpen,
    blastStudioOpen,
    setBlastStudioOpen,
    solveFarmStudioOpen,
    setSolveFarmStudioOpen,
    addBeamModalOpen,
    setAddBeamModalOpen,
  } = useStore(useShallow(state => ({
    addBeamModalOpen: state.addBeamModalOpen,
    setAddBeamModalOpen: state.setAddBeamModalOpen,
    envGalleryOpen: state.envGalleryOpen,
    setEnvGalleryOpen: state.setEnvGalleryOpen,
    aiStudioMode: state.aiStudioOpen,
    setAiStudioOpen: state.setAiStudioOpen,
    copilotStudioOpen: state.copilotStudioOpen,
    setCopilotStudioOpen: state.setCopilotStudioOpen,
    playbackMode: state.playbackMode,
    setPlaybackMode: state.setPlaybackMode,
    presentationMode: state.presentationMode,
    setPresentationMode: state.setPresentationMode,
    exportStudioOpen: state.exportStudioOpen,
    setExportStudioOpen: state.setExportStudioOpen,
    codeStudioOpen: state.codeStudioOpen,
    setCodeStudioOpen: state.setCodeStudioOpen,
    collaborationStudioOpen: state.collaborationStudioOpen,
    setCollaborationStudioOpen: state.setCollaborationStudioOpen,
    connectionStudioOpen: state.connectionStudioOpen,
    setConnectionStudioOpen: state.setConnectionStudioOpen,
    concreteStudioOpen: state.concreteStudioOpen,
    setConcreteStudioOpen: state.setConcreteStudioOpen,
    bimInteropStudioOpen: state.bimInteropStudioOpen,
    setBimInteropStudioOpen: state.setBimInteropStudioOpen,
    foundationStudioOpen: state.foundationStudioOpen,
    setFoundationStudioOpen: state.setFoundationStudioOpen,
    seismicStudioOpen: state.seismicStudioOpen,
    setSeismicStudioOpen: state.setSeismicStudioOpen,
    windStudioOpen: state.windStudioOpen,
    setWindStudioOpen: state.setWindStudioOpen,
    timberStudioOpen: state.timberStudioOpen,
    setTimberStudioOpen: state.setTimberStudioOpen,
    compositeStudioOpen: state.compositeStudioOpen,
    setCompositeStudioOpen: state.setCompositeStudioOpen,
    prestressedStudioOpen: state.prestressedStudioOpen,
    setPrestressedStudioOpen: state.setPrestressedStudioOpen,
    bridgeStudioOpen: state.bridgeStudioOpen,
    setBridgeStudioOpen: state.setBridgeStudioOpen,
    cableStudioOpen: state.cableStudioOpen,
    setCableStudioOpen: state.setCableStudioOpen,
    plateShellStudioOpen: state.plateShellStudioOpen,
    setPlateShellStudioOpen: state.setPlateShellStudioOpen,
    earthStudioOpen: state.earthStudioOpen,
    setEarthStudioOpen: state.setEarthStudioOpen,
    blastStudioOpen: state.blastStudioOpen,
    setBlastStudioOpen: state.setBlastStudioOpen,
    solveFarmStudioOpen: state.solveFarmStudioOpen,
    setSolveFarmStudioOpen: state.setSolveFarmStudioOpen,
  })));

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-primary overflow-hidden">
      <TopNav />
      
      <div className="flex-1 overflow-hidden relative">
        <PanelGroup orientation="horizontal">
          
          {/* Left Panel: Project Explorer */}
          {!leftPanelCollapsed && (
            <>
              <Panel 
                defaultSize={`${leftSize}%`} 
                minSize="15%" 
                maxSize="40%"
                onResize={(size: any) => {
                  const pct = typeof size === 'number'
                    ? size
                    : (size && typeof size === 'object' && typeof size.asPercentage === 'number' ? size.asPercentage : 20);
                  const s = Math.round(pct);
                  setLeftPanelSize(s);
                  if (s === 0) setLeftPanelCollapsed(true);
                }}
                collapsible={true}
                className="transition-all duration-200 ease-in-out bg-[#111111]"
              >
                <PanelGroup orientation="vertical">
                  <Panel defaultSize="50%" minSize="20%">
                    <ProjectExplorer />
                  </Panel>
                  <PanelResizeHandle className="h-1 bg-subtle hover:bg-accent hover:h-1.5 transition-all active:bg-accent cursor-row-resize z-10" />
                  <Panel defaultSize="50%" minSize="20%">
                    <LivePropertyInspector />
                  </Panel>
                </PanelGroup>
              </Panel>
              <PanelResizeHandle className="w-1 bg-subtle hover:bg-accent hover:w-1.5 transition-all active:bg-accent cursor-col-resize z-10" />
            </>
          )}

          {/* Center: Engineering Workspace */}
          <Panel minSize="30%">
            <CenterWorkspace />
          </Panel>

          {/* Right Panel: Archie Workspace */}
          {!rightPanelCollapsed && (
            <>
              <PanelResizeHandle className="w-1 bg-subtle hover:bg-accent hover:w-1.5 transition-all active:bg-accent cursor-col-resize z-10" />
              <Panel 
                defaultSize={`${rightSize}%`} 
                minSize="20%" 
                maxSize="50%"
                onResize={(size: any) => {
                  const pct = typeof size === 'number'
                    ? size
                    : (size && typeof size === 'object' && typeof size.asPercentage === 'number' ? size.asPercentage : 25);
                  const s = Math.round(pct);
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

        {/* Collapsed Panel Edge Re-Open Handles */}
        {leftPanelCollapsed && (
          <button
            onClick={() => setLeftPanelCollapsed(false)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-slate-900/95 hover:bg-slate-800 text-slate-300 hover:text-white border-y border-r border-slate-700/80 rounded-r-xl px-1.5 py-3 transition-all shadow-2xl flex flex-col items-center gap-1.5 group cursor-pointer"
            title="Open Project Explorer ( [ )"
          >
            <ChevronRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            <span className="text-[9px] font-semibold text-slate-400 group-hover:text-slate-200 [writing-mode:vertical-lr] tracking-widest uppercase">
              Explorer
            </span>
          </button>
        )}

        {rightPanelCollapsed && (
          <button
            onClick={() => setRightPanelCollapsed(false)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-slate-900/95 hover:bg-slate-800 text-slate-300 hover:text-white border-y border-l border-slate-700/80 rounded-l-xl px-1.5 py-3 transition-all shadow-2xl flex flex-col items-center gap-1.5 group cursor-pointer"
            title="Open Archie Assistant ( ] )"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-purple-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[9px] font-semibold text-slate-400 group-hover:text-slate-200 [writing-mode:vertical-lr] tracking-widest uppercase">
              Archie AI
            </span>
          </button>
        )}

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
          {copilotStudioOpen && (
            <ArchieCopilotStudio onClose={() => setCopilotStudioOpen(false)} />
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

        <AnimatePresence>
          {codeStudioOpen && (
            <DesignCodeInspectorStudio onClose={() => setCodeStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {collaborationStudioOpen && (
            <CollaborationSessionStudio onClose={() => setCollaborationStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {connectionStudioOpen && (
            <SteelConnectionStudio onClose={() => setConnectionStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {concreteStudioOpen && (
            <ConcreteDesignStudio onClose={() => setConcreteStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {bimInteropStudioOpen && (
            <BIMInteropStudio onClose={() => setBimInteropStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {foundationStudioOpen && (
            <FoundationStudio onClose={() => setFoundationStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {seismicStudioOpen && (
            <SeismicStudio onClose={() => setSeismicStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {windStudioOpen && (
            <WindStudio onClose={() => setWindStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {timberStudioOpen && (
            <TimberStudio onClose={() => setTimberStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {compositeStudioOpen && (
            <CompositeStudio onClose={() => setCompositeStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {prestressedStudioOpen && (
            <PrestressedStudio onClose={() => setPrestressedStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {bridgeStudioOpen && (
            <BridgeStudio onClose={() => setBridgeStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cableStudioOpen && (
            <CableStudio onClose={() => setCableStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {plateShellStudioOpen && (
            <PlateShellStudio onClose={() => setPlateShellStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {earthStudioOpen && (
            <EarthStudio onClose={() => setEarthStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {blastStudioOpen && (
            <BlastStudio onClose={() => setBlastStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {solveFarmStudioOpen && (
            <SolveFarmStudio onClose={() => setSolveFarmStudioOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {addBeamModalOpen && (
            <AddBeamModal onClose={() => setAddBeamModalOpen(false)} />
          )}
        </AnimatePresence>

        <PerformanceOverlay />
      </div>

      <NotificationCenter />
      <StatusBar />
    </div>
  );
};
