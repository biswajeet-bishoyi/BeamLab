import React from 'react';
import { Box, Layers, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { QuickActions } from './QuickActions';

interface FocusCardProps {
  id: string;
}

export const FocusCard: React.FC<FocusCardProps> = ({ id }) => {
  // Mock data based on ID
  const isBeam = id.includes('beam');
  const isNode = id.includes('node');
  
  const title = isBeam ? `Steel Beam ${id}` : isNode ? `Connection Node ${id}` : `Workspace Project`;
  const type = isBeam ? 'Structural Element' : isNode ? 'Support' : 'Assembly';

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded bg-subtle flex items-center justify-center text-accent">
          {isBeam ? <Box className="w-5 h-5" /> : isNode ? <LinkIcon className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
          <p className="text-xs text-muted">{type}</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="bg-panel border border-subtle rounded p-3">
          <h4 className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Properties</h4>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-muted">Length</div>
            <div className="text-right font-medium text-primary">{isBeam ? '6.0 m' : '-'}</div>
            <div className="text-muted">Section</div>
            <div className="text-right font-medium text-primary">{isBeam ? 'W12x26' : '-'}</div>
            <div className="text-muted">Material</div>
            <div className="text-right font-medium text-primary">A992 Steel</div>
            <div className="text-muted">Status</div>
            <div className="text-right font-medium text-green-400">Passed</div>
          </div>
        </div>

        {isBeam && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-500 mb-1">Deflection Warning</h4>
              <p className="text-xs text-amber-500/80">Live load deflection ratio L/340 exceeds recommended limit of L/360.</p>
            </div>
          </div>
        )}
      </div>

      <QuickActions contextId={id} />
    </div>
  );
};
