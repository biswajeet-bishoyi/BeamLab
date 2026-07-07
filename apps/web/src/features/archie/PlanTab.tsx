
import React from 'react';
import { useArchie } from '@beamlab/archie-client';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const PlanTab: React.FC = () => {
  const { plan } = useArchie();

  if (plan.length === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-muted">No active plan.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-app p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-primary mb-4">Execution Plan</h3>
      <div className="relative border-l-2 border-subtle ml-3 space-y-6">
        {plan.map((step) => (
          <div key={step.id} className="relative pl-6">
            <div className={clsx(
              "absolute -left-[11px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-app",
              step.status === 'completed' && "text-green-500",
              step.status === 'active' && "text-accent",
              step.status === 'pending' && "text-muted border-2 border-subtle",
              step.status === 'failed' && "text-red-500"
            )}>
              {step.status === 'completed' && <CheckCircle2 className="w-5 h-5 fill-current bg-app rounded-full" />}
              {step.status === 'active' && <Loader2 className="w-4 h-4 animate-spin" />}
              {step.status === 'pending' && <Circle className="w-3 h-3 fill-current" />}
              {step.status === 'failed' && <AlertCircle className="w-5 h-5 fill-current bg-app rounded-full" />}
            </div>
            
            <div className="flex flex-col">
              <span className={clsx("text-sm font-medium", step.status === 'active' ? "text-primary" : "text-primary/80")}>
                {step.title}
              </span>
              <span className="text-xs text-muted mt-1">{step.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
