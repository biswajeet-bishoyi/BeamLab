import React, { useEffect, useState } from 'react';
import { workspace } from '@beamlab/workspace-runtime';
import { Play, Wrench, CheckCircle2, FileText, Zap } from 'lucide-react';

interface QuickActionsProps {
  contextId: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ contextId }) => {
  const [actions, setActions] = useState<any[]>([]);

  useEffect(() => {
    // In a real app, we would query the CommandRegistry.
    // For the UI demonstration, we will mock contextual actions based on the selected object.
    
    let contextualActions = [];
    
    if (contextId.includes('beam')) {
      contextualActions = [
        { id: 'analyze', label: 'Analyze Section', icon: <Play className="w-4 h-4" /> },
        { id: 'optimize', label: 'Optimize Material', icon: <Zap className="w-4 h-4" /> },
        { id: 'check', label: 'Check Code', icon: <CheckCircle2 className="w-4 h-4" /> }
      ];
    } else if (contextId.includes('node')) {
      contextualActions = [
        { id: 'forces', label: 'Inspect Forces', icon: <Wrench className="w-4 h-4" /> },
        { id: 'connections', label: 'Check Connections', icon: <CheckCircle2 className="w-4 h-4" /> }
      ];
    } else {
      contextualActions = [
        { id: 'report', label: 'Generate Report', icon: <FileText className="w-4 h-4" /> },
        { id: 'analyze-all', label: 'Run Full Analysis', icon: <Play className="w-4 h-4" /> }
      ];
    }
    
    setActions(contextualActions);
  }, [contextId]);

  if (actions.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-subtle">
      <h4 className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">Quick Actions</h4>
      <div className="flex flex-col gap-2">
        {actions.map(action => (
          <button 
            key={action.id}
            className="flex items-center gap-2 px-3 py-2 text-sm text-primary bg-panel border border-subtle rounded hover:bg-subtle hover:border-accent transition-colors w-full text-left"
            onClick={() => {
              workspace.notifications.notify({
                type: 'success',
                title: 'Action Triggered',
                message: `Executing: ${action.label}`
              });
            }}
          >
            <span className="text-muted group-hover:text-primary">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
