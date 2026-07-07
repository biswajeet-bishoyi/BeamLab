import React from 'react';
import { Target, AlertTriangle, Layers, Shuffle } from 'lucide-react';

export const OptimizationExplorer: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white p-6 overflow-y-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
          <Target className="w-5 h-5" /> Optimization Explorer
        </h2>
        <p className="text-sm text-muted mt-1">Explore objectives, constraints, candidates, and trade-offs.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="border border-[#222] rounded-lg p-4 bg-[#111]">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-emerald-400" /> Active Objectives
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex justify-between bg-black/40 px-3 py-2 rounded border border-white/5">
              <span>Weight Reduction</span>
              <span className="text-emerald-400">0.8w</span>
            </li>
            <li className="flex justify-between bg-black/40 px-3 py-2 rounded border border-white/5">
              <span>Material Cost</span>
              <span className="text-emerald-400">0.5w</span>
            </li>
          </ul>
        </div>

        <div className="border border-[#222] rounded-lg p-4 bg-[#111]">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Active Constraints
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex justify-between bg-black/40 px-3 py-2 rounded border border-white/5">
              <span>AISC 360-16 Compliance</span>
              <span className="text-amber-400 text-xs px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">Strict</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border border-[#222] rounded-lg p-4 bg-[#111]">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-blue-400" /> Generated Candidates
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted uppercase bg-black/40 border-b border-[#222]">
              <tr>
                <th className="px-4 py-2 font-medium">Candidate ID</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-2 text-primary font-mono text-xs">cand-171822-A</td>
                <td className="px-4 py-2 text-muted">Alternative with lighter W-Shape section.</td>
                <td className="px-4 py-2"><span className="text-emerald-400 text-xs px-1.5 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20">Evaluated</span></td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-2 text-primary font-mono text-xs">cand-171822-B</td>
                <td className="px-4 py-2 text-muted">Alternative with higher grade steel.</td>
                <td className="px-4 py-2"><span className="text-emerald-400 text-xs px-1.5 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20">Evaluated</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-[#222] rounded-lg p-4 bg-[#111]">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Shuffle className="w-4 h-4 text-purple-400" /> Trade-Off Analysis
        </h3>
        <div className="bg-black/40 border border-white/5 p-4 rounded text-sm text-muted">
          <p className="mb-2"><strong>Recommended:</strong> cand-171822-A (Total Score: 87.5)</p>
          <p className="italic border-l-2 border-purple-500 pl-3">"Sacrificed some Constructability compared to cand-171822-B to maximize Weight Reduction."</p>
        </div>
      </div>
    </div>
  );
};
