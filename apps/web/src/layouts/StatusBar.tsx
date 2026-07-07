
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cpu, GitBranch, Share2, AlertTriangle, XCircle } from 'lucide-react';
import { workspace, type HealthState } from '@beamlab/workspace-runtime';

export const StatusBar: React.FC = () => {
  const [health, setHealth] = useState<HealthState>(workspace.health.getState());

  useEffect(() => {
    return workspace.on('HealthUpdated', (event: any) => {
      setHealth(event.payload);
    });
  }, []);

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy': return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      case 'error': return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      default: return <Share2 className="w-3.5 h-3.5 text-muted" />;
    }
  };

  return (
    <footer className="h-8 border-t border-subtle bg-panel flex items-center justify-between px-3 text-xs text-muted shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors" title={health.issues.join(', ')}>
          {getStatusIcon()}
          <span className="capitalize">{health.status}</span>
        </div>
        <div className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors">
          <GitBranch className="w-3.5 h-3.5" />
          <span>main</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5" />
          <span>{health.memoryUsage.toFixed(0)} MB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" />
          <span>Runtime: Connected</span>
        </div>
        <div>
          <span>Metric (m, kN, MPa)</span>
        </div>
      </div>
    </footer>
  );
};
