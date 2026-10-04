import React, { useEffect, useState } from 'react';
import { workspace } from '@beamstudio/workspace-runtime';
import { useStore } from '../../store';
import { FocusCard } from './FocusCards';

export const LivePropertyInspector: React.FC = () => {
  const [selection, setSelection] = useState<string[]>(() => {
    const wsSel = workspace.getSelection();
    if (wsSel && wsSel.length > 0) return wsSel;
    const storeSel = useStore.getState().selectedObjectId;
    return storeSel ? [storeSel] : [];
  });

  useEffect(() => {
    // 1. Subscribe to workspace selection event
    const unsubscribeWs = workspace.on('SelectionChanged', (event: any) => {
      const current = event.payload?.selection || event.payload?.current || [];
      setSelection(current);
    });

    // 2. Subscribe to store selection changes
    const unsubscribeStore = useStore.subscribe((state, prevState) => {
      if (state.selectedObjectId !== prevState.selectedObjectId) {
        if (state.selectedObjectId) {
          setSelection([state.selectedObjectId]);
        } else {
          setSelection([]);
        }
      }
    });

    return () => {
      unsubscribeWs();
      unsubscribeStore();
    };
  }, []);

  const activeFocusId = selection.length > 0 ? selection[0] : null;

  return (
    <div className="flex flex-col h-full bg-[#111111] overflow-hidden">
      <div className="h-10 border-b border-subtle flex items-center justify-between px-4 bg-panel shrink-0">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          {activeFocusId ? 'Element Inspector' : 'CAD Toolkit'}
        </h2>
        {activeFocusId && (
          <button
            onClick={() => {
              workspace.clearSelection();
              useStore.getState().selectObject(null);
            }}
            className="text-[10px] text-muted hover:text-primary transition-colors"
          >
            Deselect
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
        <FocusCard id={activeFocusId} />
      </div>
    </div>
  );
};
