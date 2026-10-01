import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Search,
  Scale,
  Calculator,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Layers,
} from 'lucide-react';
import {
  CodeClauseRetriever,
  type CodeClause,
  type DesignStandard,
} from '@beamlab/knowledge-platform';
import {
  CodeComplianceAuditor,
  CrossCodeBenchmarkEngine,
  type MemberAuditDemand,
} from '@beamlab/agent-code-compliance';

interface DesignCodeInspectorStudioProps {
  onClose: () => void;
}

const PRESET_SECTIONS = [
  {
    name: 'IPE 240',
    A: 3.91e-3,
    Av_z: 1.91e-3,
    W_pl_y: 366.6e-6,
    W_el_y: 324.3e-6,
    W_pl_z: 73.9e-6,
    Iy: 38.92e-6,
    Iz: 2.84e-6,
    It: 12.88e-8,
    Iw: 3.74e-8,
  },
  {
    name: 'HEB 260',
    A: 11.84e-3,
    Av_z: 3.76e-3,
    W_pl_y: 1150e-6,
    W_el_y: 1019e-6,
    W_pl_z: 426e-6,
    Iy: 149.2e-6,
    Iz: 51.35e-6,
    It: 123.8e-8,
    Iw: 728.9e-9,
  },
  {
    name: 'HEB 300',
    A: 14.91e-3,
    Av_z: 4.74e-3,
    W_pl_y: 1869e-6,
    W_el_y: 1678e-6,
    W_pl_z: 641e-6,
    Iy: 251.7e-6,
    Iz: 85.63e-6,
    It: 185.0e-8,
    Iw: 1688e-9,
  },
];

export const DesignCodeInspectorStudio: React.FC<DesignCodeInspectorStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'clauses' | 'calculator' | 'comparative'>('clauses');
  const [selectedStandard, setSelectedStandard] = useState<DesignStandard>('EUROCODE_3');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClauseId, setSelectedClauseId] = useState<string>('EC3_6_2_5');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculator inputs
  const [calcSectionIndex, setCalcSectionIndex] = useState(0);
  const [calcSteelGrade, setCalcSteelGrade] = useState<'S355' | 'S275' | 'A992_GR50'>('S355');
  const [calcLength, setCalcLength] = useState(6.0);
  const [calcUnbracedLT, setCalcUnbracedLT] = useState(0); // 0 = laterally restrained
  const [calcNedKN, setCalcNedKN] = useState(0);
  const [calcMyKNm, setCalcMyKNm] = useState(85);
  const [calcVzKN, setCalcVzKN] = useState(40);

  // Filter clauses by standard & search
  const displayedClauses = useMemo(() => {
    return CodeClauseRetriever.searchClauses(searchQuery, {
      standard: selectedStandard,
    });
  }, [searchQuery, selectedStandard]);

  const selectedClause: CodeClause | undefined = useMemo(() => {
    return CodeClauseRetriever.getClauseById(selectedClauseId) || displayedClauses[0];
  }, [selectedClauseId, displayedClauses]);

  // Equivalent cross-standard clauses
  const equivalentClauses = useMemo(() => {
    if (!selectedClause) return null;
    return CodeClauseRetriever.getEquivalentClauses(selectedClause.clauseId);
  }, [selectedClause]);

  // Real-time calculation audit
  const auditDemand: MemberAuditDemand = useMemo(() => {
    const sec = PRESET_SECTIONS[calcSectionIndex]!;
    const fy = calcSteelGrade === 'S355' ? 355e6 : calcSteelGrade === 'S275' ? 275e6 : 345e6;
    return {
      elementId: 'MEMBER_DEMO',
      designCode: selectedStandard,
      member: {
        length: calcLength,
        unbracedLengthLT: calcUnbracedLT,
        section: sec,
        material: {
          name: calcSteelGrade,
          fy,
          E: 210e9,
          G: 81e9,
        },
      },
      forces: {
        Ned: calcNedKN * 1e3,
        Vz_ed: calcVzKN * 1e3,
        My_ed: calcMyKNm * 1e3,
      },
    };
  }, [calcSectionIndex, calcSteelGrade, calcLength, calcUnbracedLT, calcNedKN, calcMyKNm, calcVzKN, selectedStandard]);

  const auditResult = useMemo(() => {
    return CodeComplianceAuditor.auditMember(auditDemand);
  }, [auditDemand]);

  // Real-time cross-standard comparison
  const crossCodeComparison = useMemo(() => {
    return CrossCodeBenchmarkEngine.compareMember(auditDemand);
  }, [auditDemand]);

  // Buckling comparison curves
  const bucklingPoints = useMemo(() => {
    const fy = calcSteelGrade === 'S355' ? 355e6 : calcSteelGrade === 'S275' ? 275e6 : 345e6;
    return CrossCodeBenchmarkEngine.generateBucklingCurveComparison(fy, 210e9);
  }, [calcSteelGrade]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[160] bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden ${
        isFullscreen ? 'p-0' : 'p-3 md:p-6'
      }`}
    >
      <div className="flex flex-col h-full w-full bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* ── HEADER ── */}
        <header className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Design Code Intelligence Platform
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-700/50 text-[10px] font-mono uppercase">
                  Multi-Standard v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authoritative clause knowledge, step-by-step derivations, & cross-code comparative benchmarking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Standard Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-400 text-[11px]">Standard:</span>
              <select
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value as DesignStandard)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="EUROCODE_3" className="bg-slate-900">Eurocode 3 (EN 1993-1-1)</option>
                <option value="AISC_360_16" className="bg-slate-900">AISC 360-16 (LRFD)</option>
                <option value="IS_800_2007" className="bg-slate-900">IS 800:2007</option>
              </select>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('clauses')}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'clauses' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Search className="w-3.5 h-3.5" /> Clause Index
              </button>
              <button
                onClick={() => setActiveTab('calculator')}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'calculator' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" /> Clause Verifier
              </button>
              <button
                onClick={() => setActiveTab('comparative')}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'comparative' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scale className="w-3.5 h-3.5" /> Cross-Code Benchmark
              </button>
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900 hover:text-rose-200 text-slate-300 transition-colors"
              title="Close Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 overflow-hidden p-4">
          {/* TAB 1: CLAUSE NAVIGATOR */}
          {activeTab === 'clauses' && (
            <div className="grid grid-cols-12 gap-4 h-full">
              {/* Left Column: Search & Clause List (4 cols) */}
              <div className="col-span-4 flex flex-col space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 overflow-hidden">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search clauses, formulas, limit states..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 px-0.5">
                  {['Flexure', 'Compression', 'Buckling', 'Shear', 'Tension', 'P-M'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchQuery(tag)}
                      className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 hover:text-white"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {displayedClauses.map((clause) => {
                    const isSelected = selectedClause?.clauseId === clause.clauseId;
                    return (
                      <div
                        key={clause.clauseId}
                        onClick={() => setSelectedClauseId(clause.clauseId)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/40 text-white'
                            : 'bg-slate-900/40 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-amber-400 font-bold">
                            §{clause.sectionNumber}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 font-mono text-slate-400">
                            {clause.limitState}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold mt-1 leading-snug">{clause.title}</h4>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Clause Detail & Equations (8 cols) */}
              <div className="col-span-8 flex flex-col space-y-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 overflow-y-auto">
                {selectedClause ? (
                  <>
                    <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                            {selectedClause.standard} §{selectedClause.sectionNumber}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ID: {selectedClause.clauseId}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1.5">{selectedClause.title}</h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {selectedClause.description}
                        </p>
                      </div>
                    </div>

                    {/* Governing Equations Card */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-sky-400" />
                        Codified Governing Equations
                      </h4>

                      <div className="space-y-2.5">
                        {selectedClause.equations.map((eq) => (
                          <div
                            key={eq.id}
                            className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
                          >
                            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-sm text-sky-300 text-center">
                              {eq.latex}
                            </div>
                            <p className="text-xs text-slate-400">{eq.description}</p>

                            {eq.variables.length > 0 && (
                              <div className="border border-slate-800 rounded-lg overflow-hidden text-xs">
                                <table className="w-full text-left font-mono text-[11px]">
                                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                                    <tr>
                                      <th className="p-2">Symbol</th>
                                      <th className="p-2">Parameter</th>
                                      <th className="p-2">Unit</th>
                                      <th className="p-2">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60">
                                    {eq.variables.map((v, vIdx) => (
                                      <tr key={vIdx} className="hover:bg-slate-800/30">
                                        <td className="p-2 font-bold text-white">{v.symbol}</td>
                                        <td className="p-2 text-slate-300">{v.name}</td>
                                        <td className="p-2 text-slate-400">{v.unit}</td>
                                        <td className="p-2 text-slate-400">{v.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Safety Factors Card */}
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                      <span className="font-bold text-slate-300">Partial Safety Factors:</span>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {Object.entries(selectedClause.safetyFactors).map(([key, val]) => (
                          <span
                            key={key}
                            className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-amber-300"
                          >
                            {key} = {val}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Equivalent Clauses in Other Standards */}
                    {equivalentClauses && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Scale className="w-4 h-4 text-emerald-400" />
                          Equivalent Codified Clauses in Other Standards
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(equivalentClauses).map(([std, eqClause]) => {
                            if (!eqClause || std === selectedClause.standard) return null;
                            return (
                              <div
                                key={std}
                                onClick={() => {
                                  setSelectedStandard(eqClause.standard);
                                  setSelectedClauseId(eqClause.clauseId);
                                }}
                                className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                              >
                                <div className="flex items-center justify-between text-[11px] text-indigo-400 font-mono">
                                  <span>{std}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </div>
                                <div className="text-xs font-bold text-white mt-1">
                                  §{eqClause.sectionNumber} — {eqClause.title}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    Select a clause to view details.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE STEP-BY-STEP CLAUSE VERIFIER */}
          {activeTab === 'calculator' && (
            <div className="grid grid-cols-12 gap-4 h-full">
              {/* Left Column: Parameter Form (4 cols) */}
              <div className="col-span-4 flex flex-col space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 overflow-y-auto">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-400" />
                  Demand & Section Inputs
                </h4>

                {/* Section selection */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Cross-Section Profile</label>
                  <select
                    value={calcSectionIndex}
                    onChange={(e) => setCalcSectionIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                  >
                    {PRESET_SECTIONS.map((sec, idx) => (
                      <option key={sec.name} value={idx}>
                        {sec.name} (A = {(sec.A * 1e4).toFixed(1)} cm², Wpl = {(sec.W_pl_y * 1e6).toFixed(0)} cm³)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Steel grade selection */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Steel Grade</label>
                  <select
                    value={calcSteelGrade}
                    onChange={(e) => setCalcSteelGrade(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                  >
                    <option value="S355">S355 (fy = 355 MPa)</option>
                    <option value="S275">S275 (fy = 275 MPa)</option>
                    <option value="A992_GR50">A992 Gr. 50 (fy = 50 ksi ~ 345 MPa)</option>
                  </select>
                </div>

                {/* Length & Lateral Bracing */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Length L [m]</label>
                    <input
                      type="number"
                      step="0.5"
                      value={calcLength}
                      onChange={(e) => setCalcLength(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Unbraced L_LT [m]</label>
                    <input
                      type="number"
                      step="0.5"
                      value={calcUnbracedLT}
                      onChange={(e) => setCalcUnbracedLT(Number(e.target.value))}
                      title="0 = continuously braced against lateral-torsional buckling"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Applied Forces */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300">Internal Action Demands</span>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Axial Force Ned:</span>
                      <span className="font-mono text-white">{calcNedKN} kN</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1200"
                      step="25"
                      value={calcNedKN}
                      onChange={(e) => setCalcNedKN(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Bending Moment My,ed:</span>
                      <span className="font-mono text-white">{calcMyKNm} kN·m</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="350"
                      step="5"
                      value={calcMyKNm}
                      onChange={(e) => setCalcMyKNm(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Shear Force Vz,ed:</span>
                      <span className="font-mono text-white">{calcVzKN} kN</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="250"
                      step="5"
                      value={calcVzKN}
                      onChange={(e) => setCalcVzKN(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Step-by-Step Mathematical Substitution Cards (8 cols) */}
              <div className="col-span-8 flex flex-col space-y-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 overflow-y-auto">
                {/* Status & Summary Gauge */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <span className="text-[11px] uppercase font-mono text-slate-400">Governing Check</span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {auditResult.governingCheck.clauseTitle} (§{auditResult.governingCheck.sectionNumber})
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Max Utilization (UC)</span>
                      <div className="text-lg font-bold font-mono text-white">
                        {(auditResult.maxUtilizationRatio * 100).toFixed(1)}%
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs ${
                        auditResult.overallStatus === 'PASS'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : auditResult.overallStatus === 'WARNING'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {auditResult.overallStatus}
                    </span>
                  </div>
                </div>

                {/* Substitution Cards */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step-by-Step Limit State Audits
                  </h4>

                  {auditResult.checks.map((check) => (
                    <div
                      key={check.clauseId}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">
                            §{check.sectionNumber}
                          </span>
                          <span className="text-xs font-bold text-white">{check.clauseTitle}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            check.status === 'PASS'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : check.status === 'WARNING'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          UC = {check.utilizationRatio.toFixed(2)} ({check.status})
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-sky-300">
                        {check.substitutionLatex}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>
                          Demand: {check.demandName} = {(check.demandValue / 1e3).toFixed(1)} {check.demandUnit}
                        </span>
                        <span>
                          Capacity: {check.capacityName} = {(check.capacityValue / 1e3).toFixed(1)} {check.capacityUnit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CROSS-STANDARD COMPARATIVE BENCHMARK */}
          {activeTab === 'comparative' && (
            <div className="flex flex-col space-y-4 h-full overflow-y-auto">
              {/* Comparative Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                {/* Eurocode 3 */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-400 text-xs uppercase font-mono">Eurocode 3</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono">
                      EN 1993-1-1
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    UC = {crossCodeComparison.comparativeSummary.eurocode3UC.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Governing: {crossCodeComparison.comparativeSummary.governingLimitStateByCode.EUROCODE_3}
                  </p>
                </div>

                {/* AISC 360-16 */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400 text-xs uppercase font-mono">AISC 360-16</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono">
                      LRFD Spec
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    UC = {crossCodeComparison.comparativeSummary.aisc360UC.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Governing: {crossCodeComparison.comparativeSummary.governingLimitStateByCode.AISC_360_16}
                  </p>
                </div>

                {/* IS 800:2007 */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 text-xs uppercase font-mono">IS 800:2007</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono">
                      Indian Standard
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    UC = {crossCodeComparison.comparativeSummary.is800UC.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Governing: {crossCodeComparison.comparativeSummary.governingLimitStateByCode.IS_800_2007}
                  </p>
                </div>
              </div>

              {/* Engineering Disparity Insight */}
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-xs space-y-1.5">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-indigo-400" />
                  Comparative Engineering Synthesis ({crossCodeComparison.comparativeSummary.maxDisparityPercent}% Max Disparity)
                </span>
                <p className="text-slate-300 leading-relaxed">{crossCodeComparison.engineeringInsight}</p>
              </div>

              {/* Column Buckling Curve Visualizer */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                    Comparative Column Buckling Reduction Curves (chi vs Slenderness L/r)
                  </h4>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1 text-indigo-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Eurocode 3 (curve b)
                    </span>
                    <span className="flex items-center gap-1 text-sky-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> AISC 360 (Chapter E)
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> IS 800 (Table 7)
                    </span>
                  </div>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Slenderness (L/r)</th>
                        <th className="py-2.5 px-3">Relative Slenderness (lambda_bar)</th>
                        <th className="py-2.5 px-3 text-indigo-300">chi (Eurocode 3)</th>
                        <th className="py-2.5 px-3 text-sky-300">chi (AISC 360)</th>
                        <th className="py-2.5 px-3 text-emerald-300">chi (IS 800)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {bucklingPoints.map((pt) => (
                        <tr key={pt.slendernessRatio} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-bold text-white">{pt.slendernessRatio}</td>
                          <td className="py-2.5 px-3 text-slate-400">{pt.lambda_bar}</td>
                          <td className="py-2.5 px-3 font-semibold text-indigo-400">{pt.chi_EC3}</td>
                          <td className="py-2.5 px-3 font-semibold text-sky-400">{pt.chi_AISC}</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-400">{pt.chi_IS800}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
