import React, { useState } from 'react';

type ExplorerTab = 'overview' | 'structural' | 'loading' | 'objects' | 'relationships' | 'validation' | 'history';

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
        <div className="space-y-2 font-mono text-xs">
          {[
            { ts: '2026-07-08T01:23:11Z', desc: 'Added 4 members', adds: 4, removes: 0, modifies: 0 },
            { ts: '2026-07-08T01:20:45Z', desc: 'Added supports and load patterns', adds: 7, removes: 0, modifies: 0 },
            { ts: '2026-07-08T01:15:00Z', desc: 'Initial geometry creation', adds: 14, removes: 0, modifies: 0 },
          ].map((h, i) => (
            <div key={i} className="rounded border border-slate-800 bg-slate-900/50 p-3">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-slate-200">{h.desc}</span>
                <span className="text-slate-600">{new Date(h.ts).toLocaleTimeString()}</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-emerald-400">+{h.adds} added</span>
                <span className="text-red-400">-{h.removes} removed</span>
                <span className="text-amber-400">~{h.modifies} modified</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
