import React, { useState } from 'react';

export const SolverExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'registry' | 'jobs' | 'health'>('registry');

  return (
    <div className="flex flex-col gap-4 p-4 h-full bg-surface/50 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-white">Solver Integration Framework</h2>
        <div className="flex gap-2">
          <button className={`px-3 py-1 text-sm rounded ${activeTab === 'registry' ? 'bg-primary text-white' : 'bg-surface border border-subtle'}`} onClick={() => setActiveTab('registry')}>Registry Viewer</button>
          <button className={`px-3 py-1 text-sm rounded ${activeTab === 'jobs' ? 'bg-primary text-white' : 'bg-surface border border-subtle'}`} onClick={() => setActiveTab('jobs')}>Job Viewer</button>
          <button className={`px-3 py-1 text-sm rounded ${activeTab === 'health' ? 'bg-primary text-white' : 'bg-surface border border-subtle'}`} onClick={() => setActiveTab('health')}>Health & Simulator</button>
        </div>
      </div>

      {activeTab === 'registry' && (
        <div className="p-4 bg-surface border border-subtle rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Registered Solvers</h3>
          <div className="grid gap-4">
            <div className="p-3 border border-primary/30 rounded bg-primary/5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-white">mock-solver-01</h4>
                  <p className="text-xs text-muted">BeamLab Mock Solver (SIF) v1.0.0</p>
                </div>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Online</span>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted font-medium mb-1">Capabilities:</p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">linear-static</span>
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">modal</span>
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">buckling</span>
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">10000 max elements</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="p-4 bg-surface border border-subtle rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Job Execution Monitor</h3>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted uppercase bg-black/20">
              <tr>
                <th className="px-3 py-2">Job ID</th>
                <th className="px-3 py-2">Solver</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-subtle">
                <td className="px-3 py-2 text-white">job-59a1...</td>
                <td className="px-3 py-2">mock-solver-01</td>
                <td className="px-3 py-2"><span className="text-green-400">Completed</span></td>
                <td className="px-3 py-2">1502ms</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="p-4 bg-surface border border-subtle rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Health & Failure Simulator</h3>
          <div className="mb-4">
            <p className="text-sm text-muted mb-2">Simulate real-world numerical or infrastructure failures to test the Agent's reasoning fallbacks.</p>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/50 rounded text-sm hover:bg-red-500/30">Inject Timeout Error</button>
              <button className="px-3 py-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded text-sm hover:bg-orange-500/30">Inject Divergence Error</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
