import React from 'react';
import { Shield, BookOpen, FileText, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const ComplianceExplorer: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white p-6 overflow-y-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
          <Shield className="w-5 h-5" /> Compliance Explorer
        </h2>
        <p className="text-sm text-muted mt-1">Review active standards, clauses, rule evaluations, and engineering sign-offs.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="border border-[#222] rounded-lg p-4 bg-[#111]">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-blue-400" /> Active Standard
          </h3>
          <div className="bg-black/40 p-3 rounded border border-white/5">
            <div className="text-sm font-medium">IS 800:2007</div>
            <div className="text-xs text-muted mt-1">General Construction in Steel — Code of Practice</div>
          </div>
        </div>

        <div className="border border-[#222] rounded-lg p-4 bg-[#111]">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Review Status
          </h3>
          <div className="bg-black/40 p-3 rounded border border-white/5 flex items-center justify-between">
            <div className="text-sm font-medium">Conditionally Compliant</div>
            <span className="px-2 py-0.5 rounded text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20">Review Notes</span>
          </div>
        </div>
      </div>

      <div className="border border-[#222] rounded-lg p-4 bg-[#111]">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-purple-400" /> Evaluated Clauses & Rules
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted uppercase bg-black/40 border-b border-[#222]">
              <tr>
                <th className="px-4 py-2 font-medium">Clause</th>
                <th className="px-4 py-2 font-medium">Rule ID</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-2 font-mono text-xs text-blue-300">cl-8.2.1.2</td>
                <td className="px-4 py-2 font-mono text-xs">rule-8.2.1.2-1</td>
                <td className="px-4 py-2 text-muted">Compressive strength check (P_d == A_e * f_cd)</td>
                <td className="px-4 py-2"><span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Passed</span></td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-2 font-mono text-xs text-blue-300">cl-8.7.1.1</td>
                <td className="px-4 py-2 font-mono text-xs">rule-8.7.1.1-1</td>
                <td className="px-4 py-2 text-muted">Slenderness Ratio Limit</td>
                <td className="px-4 py-2"><span className="text-amber-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Warning</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-[#222] rounded-lg p-4 bg-[#111]">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-indigo-400" /> Engineering Review
        </h3>
        <div className="bg-black/40 border border-white/5 p-4 rounded text-sm text-muted space-y-3">
          <div>
            <strong className="text-white">Approval Recommendation:</strong> Approved with Comments
          </div>
          <div>
            <strong className="text-white">Review Notes:</strong>
            <ul className="list-disc pl-5 mt-1">
              <li>The design meets criteria but has sub-optimal parameters flagged by warnings.</li>
            </ul>
          </div>
          <div>
            <strong className="text-white">Required Actions:</strong>
            <ul className="list-disc pl-5 mt-1">
              <li>Review warnings before proceeding to fabrication.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
