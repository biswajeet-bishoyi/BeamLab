
import { useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspace';

export function useKeyboardShortcuts() {
  const { 
    leftPanelCollapsed, setLeftPanelCollapsed, 
    rightPanelCollapsed, setRightPanelCollapsed 
  } = useWorkspaceStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B or Cmd+B: Toggle Left Panel
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setLeftPanelCollapsed(!leftPanelCollapsed);
      }
      // Ctrl+J or Cmd+J: Toggle Right Panel (Archie)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setRightPanelCollapsed(!rightPanelCollapsed);
      }
      // Ctrl+K or Cmd+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        console.log('Command Palette triggered');
        // TODO: Open Command Palette Dialog
      }
      // Ctrl+/ or Cmd+/: Search
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        console.log('Global Search triggered');
        // TODO: Focus search input
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [leftPanelCollapsed, rightPanelCollapsed, setLeftPanelCollapsed, setRightPanelCollapsed]);
}
