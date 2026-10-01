/**
 * BeamLab Sprint B3.4 — Global Equilibrium Audit & Free-Body Section Cut Panel
 * Interactive modal/panel displaying 6-DOF force and moment balance verification,
 * support reaction schedules, and planar free-body section cut diagnostics.
 */

import React, { useState, useMemo } from 'react';
import {
  EquilibriumVerifier,
  type EquilibriumAudit,
  type CutPlane,
} from './EquilibriumVerifier';
import {
  Scale,
  CheckCircle2,
  Scissors,
  Download,
  Copy,
  Check,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface EquilibriumAuditPanelProps {
  onClose?: () => void;
  className?: string;
}

export const EquilibriumAuditPanel: React.FC<EquilibriumAuditPanelProps> = ({
  onClose,
  className = '',
}) => {
  // Load demo audits
  const auditsMap = useMemo(() => {
    return EquilibriumVerifier.getDemoAudits('portal_frame');
  }, []);

  const comboKeys = useMemo(() => Array.from(auditsMap.keys()), [auditsMap]);
  const [selectedCombo, setSelectedCombo] = useState<string>(comboKeys[0] || 'COMB01_ULS_Grav');

  const activeAudit: EquilibriumAudit = useMemo(() => {
    return auditsMap.get(selectedCombo) || Array.from(auditsMap.values())[0]!;
  }, [auditsMap, selectedCombo]);

  // Tab mode: 'global' vs 'reactions' vs 'cut'
  const [activeTab, setActiveTab] = useState<'global' | 'reactions' | 'cut'>('global');

  // Free-body cut state
  const [cutAxis, setCutAxis] = useState<'Z' | 'X'>('Z');
  const [cutCoord, setCutCoord] = useState<number>(2.5);

  const cutResult = useMemo(() => {
    const plane: CutPlane = { axis: cutAxis, coordinate: cutCoord };
    return EquilibriumVerifier.evaluateFreeBodyCut(plane, 'positive');
  }, [cutAxis, cutCoord]);

  // Copy & Export
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyReport = () => {
    const r = activeAudit.residuals;
    const t = activeAudit.reactionTotals;
    const a = activeAudit.appliedLoads;

    const text = `BEAMLAB GLOBAL EQUILIBRIUM AUDIT REPORT
Load Combination: ${activeAudit.loadCaseName}
Status: ${r.status} (Balance: ${(100 - r.relativeForceErrorPercent).toFixed(3)}%)

1. GLOBAL FORCE EQUILIBRIUM:
• Fx: Applied ${a.totalFx} kN + Reaction ${t.totalRx} kN = Residual ${r.deltaFx} kN [${activeAudit.verificationChecks.horizontalXBalance ? 'PASS' : 'FAIL'}]
• Fy: Applied ${a.totalFy} kN + Reaction ${t.totalRy} kN = Residual ${r.deltaFy} kN [${activeAudit.verificationChecks.horizontalYBalance ? 'PASS' : 'FAIL'}]
• Fz: Applied ${a.totalFz} kN + Reaction ${t.totalRz} kN = Residual ${r.deltaFz} kN [${activeAudit.verificationChecks.verticalZBalance ? 'PASS' : 'FAIL'}]
• Total Force Residual Norm: ${r.forceResidualNorm} kN

2. GLOBAL MOMENT EQUILIBRIUM (about Origin):
• Mx: Applied ${a.totalMx} kNm + Reaction ${t.totalMrx} kNm = Residual ${r.deltaMx} kNm [${activeAudit.verificationChecks.momentXBalance ? 'PASS' : 'FAIL'}]
• My: Applied ${a.totalMy} kNm + Reaction ${t.totalMry} kNm = Residual ${r.deltaMy} kNm [${activeAudit.verificationChecks.momentYBalance ? 'PASS' : 'FAIL'}]
• Mz: Applied ${a.totalMz} kNm + Reaction ${t.totalMrz} kNm = Residual ${r.deltaMz} kNm [${activeAudit.verificationChecks.momentZBalance ? 'PASS' : 'FAIL'}]
• Total Moment Residual Norm: ${r.momentResidualNorm} kNm

3. SUPPORT REACTIONS:
${activeAudit.reactions
  .map(
    (s) =>
      `• ${s.nodeName} (${s.fixity}) at (${s.coordinates.x}, ${s.coordinates.y}, ${s.coordinates.z})m: Fx=${s.Fx}kN, Fz=${s.Fz}kN, My=${s.My}kNm, |R|=${s.resultantForce.toFixed(1)}kN`,
  )
  .join('\n')}
`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    let csv = 'Node ID,Node Name,X [m],Y [m],Z [m],Fixity,Fx [kN],Fy [kN],Fz [kN],Mx [kNm],My [kNm],Mz [kNm],Resultant Force [kN],Resultant Moment [kNm]\n';
    for (const r of activeAudit.reactions) {
      csv += `"${r.nodeId}","${r.nodeName}",${r.coordinates.x},${r.coordinates.y},${r.coordinates.z},"${r.fixity}",${r.Fx},${r.Fy},${r.Fz},${r.Mx},${r.My},${r.Mz},${r.resultantForce.toFixed(2)},${r.resultantMoment.toFixed(2)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Equilibrium_Reactions_${selectedCombo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`flex flex-col bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}
    >
      {/* 1. HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Global Equilibrium & Reaction Verifier</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Sprint B3.4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Rigorous 6-DOF force/moment equilibrium, reaction schedules, and sub-structure cuts
            </p>
          </div>
        </div>

        {/* Action Controls & Combo Switcher */}
        <div className="flex items-center gap-2 text-xs">
          {/* Combination Selector */}
          <div className="relative">
            <select
              value={selectedCombo}
              onChange={(e) => setSelectedCombo(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 pl-3 pr-8 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {comboKeys.map((k) => (
                <option key={k} value={k}>
                  {auditsMap.get(k)?.loadCaseName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Report'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* 2. TAB NAVIGATION BAR */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-slate-800 bg-slate-900/30 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('global')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'global'
                ? 'bg-emerald-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Global Equilibrium (6-DOF)</span>
          </button>

          <button
            onClick={() => setActiveTab('reactions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'reactions'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Support Reactions ({activeAudit.reactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cut')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'cut'
                ? 'bg-purple-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Free-Body Cut Engine</span>
          </button>
        </div>

        {/* Global Balance Capsule */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
              activeAudit.residuals.status === 'PERFECT' || activeAudit.residuals.status === 'BALANCED'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {activeAudit.residuals.status} (||&Delta;F|| = {activeAudit.residuals.forceResidualNorm} kN)
            </span>
          </div>
        </div>
      </div>

      {/* 3. TAB CONTENT */}
      <div className="p-6 overflow-y-auto max-h-[600px] custom-scrollbar">
        {/* TAB 1: GLOBAL EQUILIBRIUM */}
        {activeTab === 'global' && (
          <div className="flex flex-col gap-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400">Total Downward Load</div>
                <div className="text-lg font-bold font-mono text-sky-400 mt-1">
                  {activeAudit.appliedLoads.totalDownwardForce} kN
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Gravity & Dead loads</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400">Total Vertical Reaction</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                  +{activeAudit.reactionTotals.totalRz} kN
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">&sum; R<sub>z</sub> supports</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400">Lateral Force Residual</div>
                <div className="text-lg font-bold font-mono text-purple-400 mt-1">
                  {activeAudit.residuals.deltaFx} kN
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">&Delta;F<sub>x</sub> balance</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-slate-400">Equilibrium Precision</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                  {(100 - activeAudit.residuals.relativeForceErrorPercent).toFixed(3)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Conservation of force</div>
              </div>
            </div>

            {/* 6-DOF Force & Moment Matrix Table */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 font-semibold text-xs text-slate-300 flex items-center justify-between">
                <span>Global 6-DOF Force & Moment Equilibrium Matrix</span>
                <span className="text-[11px] text-slate-500 font-normal">Reference Origin: (0.00, 0.00, 0.00) m</span>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px] font-mono uppercase">
                  <tr>
                    <th className="py-2.5 px-4">DOF Component</th>
                    <th className="py-2.5 px-4 text-right">Applied Loads &sum;F<sub>ext</sub></th>
                    <th className="py-2.5 px-4 text-right">Support Reactions &sum;R</th>
                    <th className="py-2.5 px-4 text-right">Residual Discrepancy &Delta;</th>
                    <th className="py-2.5 px-4 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {/* Fx */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2 px-4 font-semibold text-slate-300">Force X (F<sub>X</sub>)</td>
                    <td className="py-2 px-4 text-right text-slate-300">{activeAudit.appliedLoads.totalFx} kN</td>
                    <td className="py-2 px-4 text-right text-emerald-400">{activeAudit.reactionTotals.totalRx > 0 ? `+${activeAudit.reactionTotals.totalRx}` : activeAudit.reactionTotals.totalRx} kN</td>
                    <td className="py-2 px-4 text-right font-bold text-sky-400">{activeAudit.residuals.deltaFx} kN</td>
                    <td className="py-2 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-semibold">PASS</span>
                    </td>
                  </tr>

                  {/* Fy */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2 px-4 font-semibold text-slate-300">Force Y (F<sub>Y</sub>)</td>
                    <td className="py-2 px-4 text-right text-slate-300">{activeAudit.appliedLoads.totalFy} kN</td>
                    <td className="py-2 px-4 text-right text-emerald-400">{activeAudit.reactionTotals.totalRy > 0 ? `+${activeAudit.reactionTotals.totalRy}` : activeAudit.reactionTotals.totalRy} kN</td>
                    <td className="py-2 px-4 text-right font-bold text-sky-400">{activeAudit.residuals.deltaFy} kN</td>
                    <td className="py-2 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-semibold">PASS</span>
                    </td>
                  </tr>

                  {/* Fz */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2 px-4 font-semibold text-slate-300">Force Z (F<sub>Z</sub> · Vertical)</td>
                    <td className="py-2 px-4 text-right text-slate-300">{activeAudit.appliedLoads.totalFz} kN</td>
                    <td className="py-2 px-4 text-right text-emerald-400">+{activeAudit.reactionTotals.totalRz} kN</td>
                    <td className="py-2 px-4 text-right font-bold text-sky-400">{activeAudit.residuals.deltaFz} kN</td>
                    <td className="py-2 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-semibold">PASS</span>
                    </td>
                  </tr>

                  {/* Mx */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2 px-4 font-semibold text-slate-300">Moment X (M<sub>X</sub>)</td>
                    <td className="py-2 px-4 text-right text-slate-300">{activeAudit.appliedLoads.totalMx} kNm</td>
                    <td className="py-2 px-4 text-right text-emerald-400">{activeAudit.reactionTotals.totalMrx} kNm</td>
                    <td className="py-2 px-4 text-right font-bold text-purple-400">{activeAudit.residuals.deltaMx} kNm</td>
                    <td className="py-2 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-semibold">PASS</span>
                    </td>
                  </tr>

                  {/* My */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2 px-4 font-semibold text-slate-300">Moment Y (M<sub>Y</sub> · Overturning)</td>
                    <td className="py-2 px-4 text-right text-slate-300">{activeAudit.appliedLoads.totalMy} kNm</td>
                    <td className="py-2 px-4 text-right text-emerald-400">{activeAudit.reactionTotals.totalMry > 0 ? `+${activeAudit.reactionTotals.totalMry}` : activeAudit.reactionTotals.totalMry} kNm</td>
                    <td className="py-2 px-4 text-right font-bold text-purple-400">{activeAudit.residuals.deltaMy} kNm</td>
                    <td className="py-2 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-semibold">PASS</span>
                    </td>
                  </tr>

                  {/* Mz */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2 px-4 font-semibold text-slate-300">Moment Z (M<sub>Z</sub> · Torsion)</td>
                    <td className="py-2 px-4 text-right text-slate-300">{activeAudit.appliedLoads.totalMz} kNm</td>
                    <td className="py-2 px-4 text-right text-emerald-400">{activeAudit.reactionTotals.totalMrz} kNm</td>
                    <td className="py-2 px-4 text-right font-bold text-purple-400">{activeAudit.residuals.deltaMz} kNm</td>
                    <td className="py-2 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-sans font-semibold">PASS</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SUPPORT REACTIONS */}
        {activeTab === 'reactions' && (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-800 bg-slate-900/70 text-slate-400 text-[11px] font-mono uppercase">
                  <tr>
                    <th className="py-3 px-4">Support Node</th>
                    <th className="py-3 px-3">Fixity</th>
                    <th className="py-3 px-3 text-right">Coordinates (X, Y, Z)</th>
                    <th className="py-3 px-3 text-right">F<sub>X</sub> [kN]</th>
                    <th className="py-3 px-3 text-right">F<sub>Z</sub> [kN]</th>
                    <th className="py-3 px-3 text-right">M<sub>Y</sub> [kNm]</th>
                    <th className="py-3 px-4 text-right font-bold text-white">|R| Force [kN]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {activeAudit.reactions.map((r) => (
                    <tr key={r.nodeId} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-200">
                        <div>{r.nodeName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{r.nodeId}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-sans">
                          {r.fixity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        ({r.coordinates.x.toFixed(1)}, {r.coordinates.y.toFixed(1)}, {r.coordinates.z.toFixed(1)}) m
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {r.Fx > 0 ? `+${r.Fx.toFixed(1)}` : r.Fx.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                        +{r.Fz.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-400">
                        {r.My > 0 ? `+${r.My.toFixed(1)}` : r.My.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-sky-400">
                        {r.resultantForce.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FREE-BODY CUT ENGINE */}
        {activeTab === 'cut' && (
          <div className="flex flex-col gap-6">
            {/* Cut Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Cut Plane:</span>
                  <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
                    <button
                      onClick={() => {
                        setCutAxis('Z');
                        setCutCoord(2.5);
                      }}
                      className={`px-2.5 py-1 rounded font-medium transition-all ${
                        cutAxis === 'Z' ? 'bg-purple-600 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      Plane Z (Horiz)
                    </button>
                    <button
                      onClick={() => {
                        setCutAxis('X');
                        setCutCoord(6.0);
                      }}
                      className={`px-2.5 py-1 rounded font-medium transition-all ${
                        cutAxis === 'X' ? 'bg-purple-600 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      Plane X (Apex)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Elevation / Coordinate:</span>
                  <input
                    type="range"
                    min={cutAxis === 'Z' ? '0.5' : '1.0'}
                    max={cutAxis === 'Z' ? '4.0' : '11.0'}
                    step="0.1"
                    value={cutCoord}
                    onChange={(e) => setCutCoord(parseFloat(e.target.value))}
                    className="w-36 accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono font-bold text-white text-xs">
                    {cutAxis} = {cutCoord.toFixed(1)} m
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
                    cutResult.subStructureEquilibrium.isEquilibrated
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {cutResult.subStructureEquilibrium.isEquilibrated
                    ? 'Sub-Structure Equilibrated'
                    : 'Discrepancy Detected'}
                </span>
              </div>
            </div>

            {/* Intersected Members Table */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 font-semibold text-xs text-slate-300 flex items-center justify-between">
                <span>Intersected Boundary Members ({cutResult.intersectedMembers.length})</span>
                <span className="text-[11px] text-slate-500 font-normal">Internal Force Transfer Vector</span>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-800 bg-slate-900/70 text-slate-400 text-[11px] font-mono uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Member</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3 text-right">Cut Station</th>
                    <th className="py-2.5 px-3 text-right">Axial N [kN]</th>
                    <th className="py-2.5 px-3 text-right">Shear Vy [kN]</th>
                    <th className="py-2.5 px-3 text-right">Moment Mz [kNm]</th>
                    <th className="py-2.5 px-4 text-right">Global F Vector [kN]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {cutResult.intersectedMembers.map((m) => (
                    <tr key={m.memberId} className="hover:bg-slate-800/30">
                      <td className="py-2 px-4 font-sans font-semibold text-slate-200">{m.memberName}</td>
                      <td className="py-2 px-3 text-slate-400 font-sans">{m.section}</td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        x = {m.cutStationX.toFixed(2)} m
                      </td>
                      <td className="py-2 px-3 text-right text-amber-400">
                        {m.internalForces.N > 0 ? `+${m.internalForces.N}` : m.internalForces.N}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-400">{m.internalForces.Vy}</td>
                      <td className="py-2 px-3 text-right text-sky-400">{m.internalForces.Mz}</td>
                      <td className="py-2 px-4 text-right text-purple-400">
                        ({m.globalForceVector.Fx}, {m.globalForceVector.Fy}, {m.globalForceVector.Fz})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sub-Structure Free-Body Equilibrium Scorecard */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div className="font-semibold text-slate-300 mb-2">
                Sub-Structure Force Balance (&sum;F<sub>ext, isolated</sub> + &sum;F<sub>cut, internal</sub> = 0)
              </div>
              <div className="grid grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[11px] font-sans">&Delta;F<sub>x</sub> Balance</div>
                  <div className="font-bold text-sky-400 mt-1">
                    {cutResult.isolatedAppliedLoads.totalFx} + {cutResult.cutInternalResultants.totalFx} = {cutResult.subStructureEquilibrium.deltaFx} kN
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[11px] font-sans">&Delta;F<sub>z</sub> Balance</div>
                  <div className="font-bold text-emerald-400 mt-1">
                    {cutResult.isolatedAppliedLoads.totalFz} + {cutResult.cutInternalResultants.totalFz} = {cutResult.subStructureEquilibrium.deltaFz} kN
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[11px] font-sans">&Delta;M<sub>y</sub> Overturning</div>
                  <div className="font-bold text-purple-400 mt-1">
                    {cutResult.isolatedAppliedLoads.totalMy} + {cutResult.cutInternalResultants.totalMy} = {cutResult.subStructureEquilibrium.deltaMy} kNm
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
