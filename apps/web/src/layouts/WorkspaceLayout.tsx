
import React from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useWorkspaceStore } from '../store/workspace';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { TopNav } from './TopNav';
import { StatusBar } from './StatusBar';
import { ProjectExplorer } from './ProjectExplorer';
import { ArchieSidebar } from './ArchieSidebar';
import { CenterWorkspace } from './CenterWorkspace';

export const WorkspaceLayout: React.FC = () => {
  useKeyboardShortcuts();

  const { 
    leftPanelCollapsed, leftPanelSize, setLeftPanelSize, setLeftPanelCollapsed,
    rightPanelCollapsed, rightPanelSize, setRightPanelSize, setRightPanelCollapsed
  } = useWorkspaceStore();

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-primary overflow-hidden">
      <TopNav />
      
      <div className="flex-1 overflow-hidden">
        <PanelGroup orientation="horizontal">
          
          {/* Left Panel: Project Explorer */}
          {!leftPanelCollapsed && (
            <>
              <Panel 
                defaultSize={leftPanelSize} 
                minSize={15} 
                maxSize={40}
                onResize={(size) => {
                  setLeftPanelSize(size.asPercentage);
                  if (size.asPercentage === 0) setLeftPanelCollapsed(true);
                }}
                collapsible={true}
                className="transition-all duration-200 ease-in-out"
              >
                <ProjectExplorer />
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
                defaultSize={rightPanelSize} 
                minSize={20} 
                maxSize={50}
                onResize={(size) => {
                  setRightPanelSize(size.asPercentage);
                  if (size.asPercentage === 0) setRightPanelCollapsed(true);
                }}
                collapsible={true}
                className="transition-all duration-200 ease-in-out"
              >
                <ArchieSidebar />
              </Panel>
            </>
          )}

        </PanelGroup>
      </div>

      <StatusBar />
    </div>
  );
};
