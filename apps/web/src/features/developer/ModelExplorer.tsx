import React, { useState } from 'react';

type ExplorerTab = 'overview' | 'objects' | 'relationships' | 'validation' | 'history';

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
