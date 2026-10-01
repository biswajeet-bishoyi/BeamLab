import React, { useState } from 'react';

type ExplorerTab = 'overview' | 'structural' | 'loading' | 'results' | 'interop' | 'diagnostics' | 'objects' | 'relationships' | 'validation' | 'history';

// ─── Mock data for display when no live model is connected ────────────────────

const MOCK_SUMMARY = {
  Node: 12,
  Member: 18,
  Material: 3,
  Section: 4,
  Support: 4,
  LoadPattern: 3,
  LoadCase: 2,
  LoadCombination: 4,
  NodeLoad: 6,
  MemberLoad: 14,
};

const MOCK_OBJECTS = [
  { id: 'n-001', name: 'Node 1', type: 'Node', status: 'approved', version: 1 },
  { id: 'n-002', name: 'Node 2', type: 'Node', status: 'approved', version: 1 },
  { id: 'm-001', name: 'Col-A', type: 'Member', status: 'draft', version: 2 },
  { id: 'mat-001', name: 'S355 Steel', type: 'Material', status: 'approved', version: 1 },
  { id: 'sec-001', name: 'IPE 300', type: 'Section', status: 'approved', version: 1 },
];

const MOCK_VALIDATION = [
  { objectId: 'm-001', code: 'CEM-XREF-001', severity: 'error', message: 'References unknown section "sec-999".' },
  { objectId: 'n-003', code: 'CEM-N001', severity: 'warning', message: 'Node coordinates appear unusually large.' },
];

const OBJECT_TYPE_COLORS: Record<string, string> = {
  Node: 'text-blue-400 bg-blue-900/20 border-blue-700/30',
  Member: 'text-green-400 bg-green-900/20 border-green-700/30',
  Material: 'text-amber-400 bg-amber-900/20 border-amber-700/30',
  Section: 'text-purple-400 bg-purple-900/20 border-purple-700/30',
  Support: 'text-cyan-400 bg-cyan-900/20 border-cyan-700/30',
  LoadPattern: 'text-rose-400 bg-rose-900/20 border-rose-700/30',
  LoadCase: 'text-orange-400 bg-orange-900/20 border-orange-700/30',
  LoadCombination: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30',
  NodeLoad: 'text-fuchsia-400 bg-fuchsia-900/20 border-fuchsia-700/30',
  MemberLoad: 'text-indigo-400 bg-indigo-900/20 border-indigo-700/30',
};

export const ModelExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('overview');

  const tabs: { key: ExplorerTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'structural', label: 'Structural' },
    { key: 'loading', label: 'Loading' },
    { key: 'results', label: 'Results' },
    { key: 'interop', label: 'BIM & Interop' },
    { key: 'diagnostics', label: 'Diagnostics' },
    { key: 'objects', label: 'Objects' },
    { key: 'relationships', label: 'Relationships' },
    { key: 'validation', label: 'Validation' },
    { key: 'history', label: 'History' },
  ];

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Engineering Model Explorer</h2>
          <p className="text-xs text-slate-500 mt-0.5">Canonical Engineering Model — read-only inspection</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-900/30 border border-emerald-700/40 text-emerald-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Model Active · v3 · SI
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-800 pb-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
              activeTab === t.key
                ? 'text-blue-400 border-b-2 border-blue-500 -mb-px bg-blue-950/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content panels */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Project card */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Project</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Name', 'Hospital Tower — Structural Frame'],
                ['Number', 'BL-2026-001'],
                ['Engineer', 'A. Sharma, P.Eng.'],
                ['Unit System', 'SI (kN, m, kPa)'],
                ['Version', '3 · Rev B'],
                ['Status', 'In Review'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-500 w-24 shrink-0">{k}</span>
                  <span className="text-slate-200">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Object count grid */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Object Summary</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(MOCK_SUMMARY).map(([type, count]) => (
                <div
                  key={type}
                  className={`flex items-center justify-between px-3 py-2 rounded border text-xs font-medium ${OBJECT_TYPE_COLORS[type] ?? 'text-slate-400 bg-slate-800/30 border-slate-700/30'}`}
                >
                  <span>{type}</span>
                  <span className="font-mono font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Structures */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Structures</h3>
            {['Frame — Main Structural Frame', 'Foundation — Pile Cap System'].map(s => (
              <div key={s} className="flex items-center gap-2 py-1.5 border-b border-slate-800 last:border-0 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'objects' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Showing {MOCK_OBJECTS.length} of {Object.values(MOCK_SUMMARY).reduce((a, b) => a + b, 0)} objects</p>
          {MOCK_OBJECTS.map(obj => (
            <div key={obj.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs flex items-center justify-between hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${OBJECT_TYPE_COLORS[obj.type] ?? ''}`}>
                  {obj.type}
                </span>
                <div>
                  <div className="text-slate-200 font-medium">{obj.name}</div>
                  <div className="text-slate-500 font-mono">{obj.id} · v{obj.version}</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs ${obj.status === 'approved' ? 'text-emerald-400 bg-emerald-900/20' : 'text-amber-400 bg-amber-900/20'}`}>
                {obj.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'relationships' && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 font-mono text-xs text-slate-400 space-y-2">
          <p className="text-slate-200 font-sans font-semibold text-sm mb-3">Reference Graph</p>
          {[
            ['m-001 (Col-A)', 'startNode → n-001', 'Requires'],
            ['m-001 (Col-A)', 'endNode → n-002', 'Requires'],
            ['m-001 (Col-A)', 'material → mat-001', 'Requires'],
            ['m-001 (Col-A)', 'section → sec-001', 'Requires'],
            ['sup-001', 'node → n-001', 'DependsOn'],
            ['nl-001', 'node → n-002', 'DependsOn'],
            ['nl-001', 'loadPattern → lp-dead', 'DependsOn'],
          ].map(([src, ref, edge], i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-blue-400">{src}</span>
              <span className="text-slate-600">──[{edge}]──▶</span>
              <span className="text-green-400">{ref}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'structural' && (
        <div className="space-y-4">
          {/* Structural System header */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Structural System</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['System', 'Hospital Tower — Main Frame'],
                ['Type', '3D Frame'],
                ['Unit System', 'SI (kN, m, kPa)'],
                ['Coordinate System', 'Global (CSYS-01)'],
                ['Structures', '1 structural system'],
                ['Assemblies', '3 (Frame, Floor, Bracing)'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-500 w-32 shrink-0">{k}</span>
                  <span className="text-slate-200">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assemblies */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Assemblies</h3>
            {[
              { name: 'Main Frame', type: 'Frame', nodes: 12, members: 18 },
              { name: 'Floor Level 2', type: 'Floor', nodes: 6, members: 8 },
              { name: 'Lateral Bracing', type: 'BracingSystem', nodes: 4, members: 4 },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span className="text-slate-200 font-medium">{a.name}</span>
                  <span className="text-slate-500 bg-purple-900/20 border border-purple-700/20 px-1.5 py-0.5 rounded text-xs">{a.type}</span>
                </div>
                <span className="text-slate-500 font-mono">{a.nodes}N · {a.members}M</span>
              </div>
            ))}
          </div>

          {/* Materials */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Materials</h3>
            {[
              { grade: 'S355', category: 'Steel', E: '210,000 MPa', fy: '355 MPa', ρ: '7850 kg/m³' },
              { grade: 'M30', category: 'Concrete', E: '27,400 MPa', fy: '30 MPa', ρ: '2500 kg/m³' },
              { grade: 'Al-6061-T6', category: 'Aluminium', E: '68,900 MPa', fy: '276 MPa', ρ: '2700 kg/m³' },
            ].map((m, i) => (
              <div key={i} className="py-2 border-b border-slate-800 last:border-0 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-400 font-semibold">{m.grade}</span>
                  <span className="text-slate-500 bg-amber-900/20 border border-amber-700/20 px-1.5 py-0.5 rounded">{m.category}</span>
                </div>
                <div className="flex gap-4 text-slate-500 font-mono">
                  <span>E={m.E}</span><span>fy={m.fy}</span><span>ρ={m.ρ}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Sections */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sections</h3>
            {[
              { desig: 'IPE 300', type: 'I', A: '53.81 cm²', Iy: '8356 cm⁴', mass: '42.2 kg/m' },
              { desig: 'IPE 200', type: 'I', A: '28.48 cm²', Iy: '1943 cm⁴', mass: '22.4 kg/m' },
              { desig: 'W12x26', type: 'I', A: '49.03 cm²', Iy: '8370 cm⁴', mass: '38.7 kg/m' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 font-semibold">{s.desig}</span>
                  <span className="text-slate-500">{s.type}-shape</span>
                </div>
                <div className="flex gap-3 text-slate-500 font-mono">
                  <span>A={s.A}</span><span>Iy={s.Iy}</span><span>{s.mass}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Coordinate Systems */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Coordinate Systems</h3>
            {[
              { id: 'cs-global', name: 'Global', type: 'Global', origin: '(0, 0, 0)' },
              { id: 'cs-local-01', name: 'Construction CS', type: 'Construction', origin: '(10.5, 0, 0)' },
            ].map((cs, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span className="text-slate-200">{cs.name}</span>
                  <span className="text-cyan-400 text-xs">{cs.type}</span>
                </div>
                <span className="text-slate-500 font-mono">{cs.origin}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'loading' && (
        <div className="space-y-4">
          {/* Loading System Summary */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Loading System</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Loads Defined', '6 (Point, Distributed, Thermal, pressure...)'],
                ['Total Assignments', '12 load assignments'],
                ['Load Patterns', '4 patterns (Dead, Live, Wind, Wind-Y)'],
                ['Load Groups', '2 groups (Gravity, Environmental)'],
                ['Analysis Cases', '3 cases (DL-Static, LL-Static, Wind-RS)'],
                ['Combinations', '4 combinations (IS800-ULS, AISC-ASD...)'],
                ['Design Envelopes', '2 envelopes (Max-Moment, Absolute-Max)'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-500 w-32 shrink-0">{k}</span>
                  <span className="text-slate-200">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Load Patterns & Groups */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Load Patterns & Groups</h3>
            <div className="space-y-3">
              {[
                { name: 'Dead Load (DL)', type: 'Dead', selfWeight: 'Enabled (x1.0)', group: 'Gravity' },
                { name: 'Live Load (LL)', type: 'Live', selfWeight: 'Disabled', group: 'Gravity' },
                { name: 'Wind Load X (WL-X)', type: 'Wind', selfWeight: 'Disabled', group: 'Environmental' },
                { name: 'Wind Load Y (WL-Y)', type: 'Wind', selfWeight: 'Disabled', group: 'Environmental' },
              ].map((pat, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-medium">{pat.name}</span>
                      <span className="text-[10px] text-rose-400 bg-rose-950/40 border border-rose-900/40 px-1 py-0.2 rounded font-mono">{pat.type}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">Self weight: {pat.selfWeight}</span>
                  </div>
                  <span className="text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded text-[10px] font-medium">{pat.group}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Load Cases */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Load Cases</h3>
            <div className="space-y-3">
              {[
                { name: 'DL-Static', type: 'LinearStatic', factor: 'Dead (x1.0)' },
                { name: 'LL-Static', type: 'LinearStatic', factor: 'Live (x1.0)' },
                { name: 'Wind-RS', type: 'ResponseSpectrum', factor: 'WL-X (x1.0), WL-Y (x0.3)', modalDep: 'Modal-Case-1' },
              ].map((c, i) => (
                <div key={i} className="py-2 border-b border-slate-800/60 last:border-0 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-orange-400 font-semibold">{c.name}</span>
                    <span className="text-slate-500 bg-orange-950/20 border border-orange-900/20 px-1.5 py-0.5 rounded text-[10px]">{c.type}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Patterns: {c.factor}</span>
                    {c.modalDep && <span className="text-slate-400">Modal Dep: {c.modalDep}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Load Combinations */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Load Combinations (Design Standards)</h3>
            <div className="space-y-3">
              {[
                { name: 'IS800-ULS-01', std: 'IS800', type: 'ULS', formula: '1.5 × DL-Static + 1.5 × LL-Static' },
                { name: 'AISC-LRFD-02', std: 'AISC-LRFD', type: 'LRFD', formula: '1.2 × DL-Static + 1.6 × LL-Static + 0.5 × Wind-RS' },
                { name: 'AISC-ASD-03', std: 'AISC-ASD', type: 'ASD', formula: '1.0 × DL-Static + 1.0 × LL-Static' },
              ].map((comb, i) => (
                <div key={i} className="py-2 border-b border-slate-800/60 last:border-0 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-yellow-400 font-semibold">{comb.name}</span>
                    <div className="flex gap-1">
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{comb.std}</span>
                      <span className="text-[10px] text-yellow-400 bg-yellow-950/30 border border-yellow-900/30 px-1.5 py-0.5 rounded">{comb.type}</span>
                    </div>
                  </div>
                  <p className="text-slate-500 font-mono text-[10px]">{comb.formula}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Load Envelopes */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Load Envelopes</h3>
            <div className="space-y-2">
              {[
                { name: 'Max-Moment-Envelope', type: 'Maximum', sources: 'IS800-ULS-01, AISC-LRFD-02' },
                { name: 'Absolute-Max-Envelope', type: 'AbsoluteMaximum', sources: 'AISC-LRFD-02, AISC-ASD-03' },
              ].map((e, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0 text-xs">
                  <div>
                    <span className="text-slate-200 font-medium">{e.name}</span>
                    <p className="text-slate-500 text-[10px]">Sources: {e.sources}</p>
                  </div>
                  <span className="text-cyan-400 text-[10px] bg-cyan-950/20 border border-cyan-900/20 px-1.5 py-0.5 rounded font-mono">{e.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="space-y-4">
          {/* Analysis Results Summary */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Analysis Results (CEM B1.4)</h3>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded font-mono">
                Status: Completed
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Active Result ID', 'res-canon-01'],
                ['Solver ID', 'direct-stiffness-v1 (Direct Sparse)'],
                ['Convergence', 'Converged (1 iter, residual < 1e-9)'],
                ['Execution Time', '42 ms'],
                ['Model Revision', 'Rev #4'],
                ['Analyzed Cases', '3 cases (DL-Static, LL-Static, Wind-RS)'],
                ['Design Envelopes', '2 envelopes (Max-Bending, Min-Bending)'],
                ['Statics Equilibrium', '✓ Verified (Relative Error: 0.001%)'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-500 w-36 shrink-0">{k}</span>
                  <span className="text-slate-200">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Governing Case Extremes */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Governing Case Extremes</h3>
            <div className="space-y-3">
              {[
                { case: 'DL-Static', maxDisp: '4.8 mm @ Node N-2', maxMoment: '42.5 kN·m @ Member M-1', maxShear: '28.3 kN @ Support N-1', eq: 'Passed (0.00%)' },
                { case: 'LL-Static', maxDisp: '6.2 mm @ Node N-2', maxMoment: '56.0 kN·m @ Member M-1', maxShear: '37.4 kN @ Support N-1', eq: 'Passed (0.00%)' },
                { case: 'IS800-ULS-01', maxDisp: '16.5 mm @ Node N-2', maxMoment: '147.8 kN·m @ Member M-1', maxShear: '98.6 kN @ Support N-1', eq: 'Passed (0.00%)' },
              ].map((c, i) => (
                <div key={i} className="py-2 border-b border-slate-800/60 last:border-0 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-cyan-400 font-semibold">{c.case}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/20 px-1.5 py-0.5 rounded">Equilibrium: {c.eq}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                    <span>Max Disp: <strong className="text-slate-200">{c.maxDisp}</strong></span>
                    <span>Max Moment: <strong className="text-amber-300">{c.maxMoment}</strong></span>
                    <span>Max Shear: <strong className="text-rose-300">{c.maxShear}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic & Stability Analysis */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dynamic & Stability Eigenvalues</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 border-r border-slate-800 pr-4">
                <span className="text-slate-400 font-medium">Modal Analysis (First 2 Modes)</span>
                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Mode 1 (Flexure)</span>
                    <span className="text-cyan-400 font-mono">f = 4.25 Hz (T = 0.235 s)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Mode 2 (Torsion)</span>
                    <span className="text-cyan-400 font-mono">f = 11.80 Hz (T = 0.085 s)</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 pl-2">
                <span className="text-slate-400 font-medium">Eigenvalue Buckling</span>
                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Critical Load Factor (λ_cr)</span>
                    <span className="text-emerald-400 font-mono font-bold">4.82 (Stable &gt; 1.0)</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Governing Mode</span>
                    <span>Mode 1 (Major Axis Flexural)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'interop' && (
        <div className="space-y-4 text-xs">
          {/* Interop Status Banner */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                BIM & External Structural Interoperability Engine
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-800/40">
                5 Providers Active · Pure TypeScript
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Universal structural exchange layer with zero native binary dependencies. Operates symmetrically in browser web workers and Node runtimes with SI unit discipline.
            </p>
          </div>

          {/* Registered Interop Adapters Table */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Registered Format Adapters
            </h4>
            <div className="space-y-2">
              {[
                { format: 'IFC4 / IFC2X3', name: 'IFC Structural Analysis Provider', exts: ['.ifc', '.stp'], dir: 'BiDirectional', badge: 'text-indigo-400 bg-indigo-950/30 border-indigo-800/30', desc: 'ISO 10303-21 STEP-SPF point connections, curve members, and material bindings.' },
                { format: 'AutoCAD DXF', name: 'AutoCAD DXF Provider', exts: ['.dxf'], dir: 'BiDirectional', badge: 'text-amber-400 bg-amber-950/30 border-amber-800/30', desc: 'ASCII DXF LINE/POINT interchange with spatial vertex merging tolerance.' },
                { format: 'Bentley STAAD', name: 'STAAD.Pro Command File Provider', exts: ['.std'], dir: 'BiDirectional', badge: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/30', desc: 'Joint coordinates, member incidences, and fixed/pinned supports with Y-up to Z-up transposition.' },
                { format: 'CSI SAP2000', name: 'SAP2000 / ETABS Exchange Provider', exts: ['.s2k', '.e2k'], dir: 'BiDirectional', badge: 'text-blue-400 bg-blue-950/30 border-blue-800/30', desc: 'Relational text tables for joints, frame connectivity, and degree-of-freedom restraint assignments.' },
                { format: 'Tabular CSV', name: 'Tabular Structural Exchange Provider', exts: ['.csv', '.txt'], dir: 'BiDirectional', badge: 'text-teal-400 bg-teal-950/30 border-teal-800/30', desc: 'Lightweight spreadsheet and script interchange for nodes, members, sections, and point/distributed loads.' },
              ].map((adapter, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded border border-slate-800/80 bg-slate-950/40 gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${adapter.badge}`}>
                        {adapter.format}
                      </span>
                      <span className="font-medium text-slate-200">{adapter.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{adapter.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono self-end sm:self-center">
                    <span className="text-slate-400">{adapter.exts.join(', ')}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {adapter.dir}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Universal Translation & Mapping Engine */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Coordinate Transformation
              </h4>
              <ul className="space-y-1.5 text-slate-300 text-xs">
                <li className="flex items-center justify-between">
                  <span className="text-slate-500">Elevation Up-Axis</span>
                  <span className="font-mono text-cyan-400">Y-up ↔ Canonical Z-up</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-500">Unit Scaling</span>
                  <span className="font-mono text-cyan-400">mm / in / ft → SI (m)</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-500">Node Coincidence Tol.</span>
                  <span className="font-mono text-slate-400">1.0 × 10⁻⁴ m (0.1 mm)</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-500">Precision Guarantee</span>
                  <span className="font-mono text-emerald-400">Deterministic IEEE-754</span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Material & Section Mapping
              </h4>
              <ul className="space-y-1.5 text-slate-300 text-xs">
                <li className="flex items-center justify-between">
                  <span className="text-slate-500">Steel Alias Resolution</span>
                  <span className="font-mono text-purple-400">S355, S275, A36, Fe410</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-500">Concrete & Timber</span>
                  <span className="font-mono text-purple-400">M25, M30, C24, GL24h</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-500">Standard Profiles</span>
                  <span className="font-mono text-slate-400">IPE, ISMB, W-Shape, CHS</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-500">Parametric Rectangles</span>
                  <span className="font-mono text-emerald-400">RECT_b×h Dimension Parser</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="space-y-4 text-xs">
          {/* Model Health Score Banner */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Model Integrity & Health Diagnostic Score
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automated topology audit, degree-of-freedom tally, and kinematic stability check
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-400">98 / 100</div>
                  <div className="text-[10px] text-emerald-500 font-medium">Rating: Excellent</div>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-emerald-500/40 bg-emerald-950/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  98%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded border border-slate-800/80">
              <span className="text-emerald-400 font-bold">✓ Model Verified:</span>
              <span>Zero rigid-body mechanisms, no isolated nodes, and zero circular dependencies.</span>
            </div>
          </div>

          {/* Matrix & Degrees of Freedom Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Degree of Freedom (DoF) Analysis
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Total DoFs (6/node)</div>
                  <div className="text-base font-bold font-mono text-blue-400 mt-0.5">72</div>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Restrained DoFs</div>
                  <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">24</div>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Active Free DoFs</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">48</div>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Kinematic Stability</div>
                  <div className="text-xs font-semibold text-emerald-400 mt-1">Stable (Restr ≥ 6)</div>
                </div>
              </div>
              <div className="space-y-1 text-[11px] text-slate-400 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Half-Bandwidth</span>
                  <span className="font-mono text-slate-300">18 DoFs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Matrix Sparsity Estimate</span>
                  <span className="font-mono text-emerald-400">96.2% Sparse</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Memory Footprint & Graph Stats
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Estimated Memory</div>
                  <div className="text-base font-bold font-mono text-purple-400 mt-0.5">14.8 KB</div>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Graph Edges</div>
                  <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">76</div>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">DAG Cycle Check</div>
                  <div className="text-xs font-semibold text-emerald-400 mt-1">0 Cycles (Acyclic)</div>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Orphan Entities</div>
                  <div className="text-xs font-semibold text-slate-400 mt-1">0 Detected</div>
                </div>
              </div>
              <div className="space-y-1 text-[11px] text-slate-400 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Topological Ordering</span>
                  <span className="font-mono text-slate-300">Resolved (54 Objects)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active CEM Subscriptions</span>
                  <span className="font-mono text-cyan-400">13 Event Handlers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Event Stream Auditor Panel */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Live CEM Event Stream & Auditor Log
              </h4>
              <span className="text-[10px] font-mono text-slate-500">Ring Buffer (500 max)</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              {[
                { seq: 42, type: 'AnalysisResultCreated', objId: 'res-canon-01', time: '10:28:40', badge: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40', detail: 'LinearStatic solver completed with 48 free DoFs' },
                { seq: 41, type: 'EngineeringObjectCreated', objId: 'sup-004', time: '10:25:02', badge: 'text-blue-400 bg-blue-950/40 border-blue-800/40', detail: 'Support node-004 pinned boundary condition registered' },
                { seq: 40, type: 'RelationshipCreated', objId: 'm-001', time: '10:24:15', badge: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40', detail: 'Member m-001 connected startNode: n-001, endNode: n-002' },
                { seq: 39, type: 'EngineeringObjectCreated', objId: 'm-001', time: '10:23:45', badge: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40', detail: 'Member Col-A created with IPE 300 section profile' },
                { seq: 38, type: 'EngineeringObjectCreated', objId: 'mat-001', time: '10:21:10', badge: 'text-amber-400 bg-amber-950/40 border-amber-800/40', detail: 'StructuralMaterial S355 Steel registered (E=210 GPa)' },
              ].map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 w-7">#{ev.seq}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border font-sans font-medium ${ev.badge}`}>
                      {ev.type}
                    </span>
                    <span className="text-slate-300 font-sans">{ev.detail}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 font-sans text-[10px]">
                    <span className="font-mono text-slate-400">{ev.objId}</span>
                    <span>{ev.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="space-y-2">
          {MOCK_VALIDATION.length === 0 ? (
            <div className="text-emerald-400 text-sm py-4 text-center">✓ All objects pass validation</div>
          ) : (
            MOCK_VALIDATION.map((d, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 text-xs ${d.severity === 'error' ? 'border-red-700/40 bg-red-900/20' : 'border-amber-700/40 bg-amber-900/20'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-bold ${d.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                    [{d.severity.toUpperCase()}]
                  </span>
                  <span className="font-mono text-slate-500">{d.code}</span>
                  <span className="text-slate-500 font-mono ml-auto">{d.objectId}</span>
                </div>
                <p className="text-slate-300">{d.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3 font-mono text-xs">
          {/* Provenance Traceability Banner */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-sans">
              Engineering Provenance & Traceability Chain
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">
              Result (res-canon-01) → Analysis (run-42) → Revision (Rev #4) → Inputs (Hash: a89c09bf) → Solver (direct-stiffness-v1) → Evidence (IS800:Cl.5.3)
            </p>
          </div>

          {[
            { ts: '2026-07-08T01:28:40Z', type: 'AnalysisRun', desc: 'Solver run completed: LinearStatic (42ms, converged)', author: 'direct-stiffness-v1', rev: 4, badge: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40' },
            { ts: '2026-07-08T01:25:12Z', type: 'LoadChange', desc: 'Applied distributed load 15 kN/m on M-1 in Dead Pattern', author: 'Alice (Engineer)', rev: 3, badge: 'text-rose-400 bg-rose-950/40 border-rose-800/40' },
            { ts: '2026-07-08T01:23:11Z', type: 'ModelChange', desc: 'Added 4 members and assigned IPE 300 sections', author: 'Alice (Engineer)', rev: 2, badge: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' },
            { ts: '2026-07-08T01:15:00Z', type: 'ModelChange', desc: 'Initial canonical model initialized: Frame Structure', author: 'BeamLab Kernel', rev: 1, badge: 'text-slate-400 bg-slate-800/40 border-slate-700/40' },
          ].map((h, i) => (
            <div key={i} className="rounded border border-slate-800 bg-slate-900/50 p-3">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] border font-sans font-medium ${h.badge}`}>
                    {h.type}
                  </span>
                  <span className="text-slate-200">{h.desc}</span>
                </div>
                <span className="text-slate-600">{new Date(h.ts).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-sans">
                <span>Author: <strong className="text-slate-400">{h.author}</strong></span>
                <span>Revision: <strong className="text-slate-400">Rev #{h.rev}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
