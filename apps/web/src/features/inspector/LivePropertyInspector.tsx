import React, { useEffect, useState } from 'react';
import { workspace } from '@beamlab/workspace-runtime';
import { FocusCard } from './FocusCards';

export const LivePropertyInspector: React.FC = () => {
  const [selection, setSelection] = useState<string[]>(workspace.getSelection());

  useEffect(() => {
    // Subscribe to SelectionChanged event
    const unsubscribe = workspace.on('SelectionChanged', (event: any) => {
      setSelection(event.payload.current || []);
    });
    
    return unsubscribe;
  }, []);

  const activeFocusId = selection.length > 0 ? selection[0] : null;

  return (
    <div className="flex flex-col h-full bg-[#111111] overflow-hidden">
      <div className="h-10 border-b border-subtle flex items-center px-4 bg-panel">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Property Inspector</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeFocusId ? (
          <FocusCard id={activeFocusId} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted text-sm text-center">
            Select an object in the Explorer or Canvas to view its properties and actions.
          </div>
        )}
      </div>
    </div>
  );
};
