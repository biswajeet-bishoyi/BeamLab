import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  TrendingDown,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';
import type { HumanApprovalGate, SectionOptimizationProposal } from '@beamstudio/archie-kernel';

interface HumanApprovalModalProps {
  gate: HumanApprovalGate;
  proposals: SectionOptimizationProposal[];
  onApprove: (notes?: string) => void;
  onReject: (notes?: string) => void;
}

export const HumanApprovalModal: React.FC<HumanApprovalModalProps> = ({
  gate,
  proposals,
  onApprove,
  onReject,
}) => {
  const [engineerNotes, setEngineerNotes] = useState('');

  const totalSavedWeight = proposals.reduce((acc, p) => acc + (p.currentWeightKg - p.proposedWeightKg), 0);
  const totalInitialWeight = proposals.reduce((acc, p) => acc + p.currentWeightKg, 0);
  const percentSaved = totalInitialWeight > 0 ? (totalSavedWeight / totalInitialWeight) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        className="w-full max-w-2xl bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-950/40 overflow-hidden flex flex-col text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-950/60 to-slate-900 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Engineer-in-the-Loop Safety Gate
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  {gate.status}
                </span>
              </h3>
              <p className="text-xs text-amber-200/70">
                Action requires licensed structural engineer verification before applying changes.
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Action & Description */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-mono text-[11px]">Gate ID: {gate.id}</span>
              <span className="font-mono text-indigo-400">{gate.action}</span>
            </div>
            <p className="font-medium text-slate-200">{gate.description}</p>
            <p className="text-slate-400">{gate.impactSummary}</p>
          </div>

          {/* Sizing Proposal Diff Table */}
          {proposals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  Proposed Cross-Section Modifications
                </h4>
                <div className="text-xs font-bold text-emerald-400">
                  Total Weight Savings: {totalSavedWeight.toFixed(1)} kg ({percentSaved.toFixed(1)}%)
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Member ID</th>
                      <th className="py-2.5 px-3">Current Profile</th>
                      <th className="py-2.5 px-3"></th>
                      <th className="py-2.5 px-3">Proposed Profile</th>
                      <th className="py-2.5 px-3">Weight Δ</th>
                      <th className="py-2.5 px-3">New UC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {proposals.map((prop) => (
                      <tr key={prop.elementId} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-white">{prop.elementId}</td>
                        <td className="py-2.5 px-3 text-slate-300">{prop.currentSection}</td>
                        <td className="py-2.5 px-1 text-slate-500">
                          <ArrowRight className="w-3 h-3" />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">{prop.proposedSection}</td>
                        <td className="py-2.5 px-3 text-emerald-400">
                          -{prop.weightDeltaKg.toFixed(1)} kg ({prop.weightReductionPercent.toFixed(0)}%)
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              prop.newUtilizationRatio <= 0.9
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {(prop.newUtilizationRatio * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Engineer Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
              Engineer Review Comments / Justification
            </label>
            <textarea
              value={engineerNotes}
              onChange={(e) => setEngineerNotes(e.target.value)}
              placeholder="e.g. Verified Eurocode 3 combined bending-axial interaction; deflections remain below L/300 limit."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => onReject(engineerNotes)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <XCircle className="w-4 h-4" /> Reject Proposal
          </button>

          <button
            onClick={() => onApprove(engineerNotes)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all"
          >
            <CheckCircle className="w-4 h-4" /> Approve & Apply to Model
          </button>
        </div>
      </motion.div>
    </div>
  );
};
