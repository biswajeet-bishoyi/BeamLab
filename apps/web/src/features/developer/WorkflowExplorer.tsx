import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@beamworks/design-system';

export const WorkflowExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'graph' | 'timeline' | 'matrix' | 'conflicts' | 'context' | 'metrics'>('graph');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Workflow Explorer</h2>
        <div className="flex gap-2">
          {['graph', 'timeline', 'matrix', 'conflicts', 'context', 'metrics'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeTab === 'graph' && (
          <Card className="bg-slate-900 border-slate-800 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-slate-200">Engineering Dependency Graph</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-slate-950 rounded border border-slate-800 font-mono text-sm text-slate-400 min-h-[300px] flex items-center justify-center">
                [DAG Visualization Placeholder]
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'matrix' && (
          <Card className="bg-slate-900 border-slate-800 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-slate-200">Decision Matrix & Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Active Policy: Safety First</h4>
                  <div className="text-xs text-slate-500 font-mono">
                    Weights: Safety (0.5), Cost (0.1), Carbon (0.1), Constructability (0.1), Confidence (0.2)
                  </div>
                </div>
                <div className="p-4 bg-slate-950 rounded border border-slate-800 font-mono text-sm text-slate-400 min-h-[200px] flex items-center justify-center">
                  [Decision Matrix Placeholder]
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'conflicts' && (
          <Card className="bg-slate-900 border-slate-800 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-slate-200">Engineering Negotiation Engine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-slate-950 rounded border border-slate-800 font-mono text-sm text-slate-400 min-h-[300px] flex items-center justify-center">
                [Negotiation History Placeholder]
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
