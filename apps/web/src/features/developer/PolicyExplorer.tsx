import React, { useState, useEffect } from 'react';
import { Play, Shield, Activity, Save, Search, CheckCircle2, AlertTriangle, XCircle, ChevronRight, Clock, Terminal } from 'lucide-react';
import { policyClient } from '../../store/policy';
import type { PolicyDecision, ActionRequest } from '@beamlab/policy-engine';

const SCENARIOS = [
  {
    name: 'Delete Structural Member',
    request: { action: 'Delete', resource: { type: 'StructuralMember', id: 'beam-01' }, context: { user: 'u1', roles: ['Engineer'] } }
  },
  {
    name: 'Generate Report',
    request: { action: 'GenerateReport', resource: { type: 'Report', exists: false }, context: { user: 'u1', roles: ['Engineer'] } }
  },
  {
    name: 'Overwrite Report',
    request: { action: 'GenerateReport', resource: { type: 'Report', exists: true }, context: { user: 'u1', roles: ['Engineer'] } }
  },
  {
    name: 'Bulk Delete',
    request: { action: 'BulkDelete', resource: { type: 'StructuralMember' }, context: { user: 'u1', roles: ['Admin'] } }
  }
];

export const PolicyExplorer: React.FC = () => {
  const [requestJson, setRequestJson] = useState(JSON.stringify(SCENARIOS[0].request, null, 2));
  const [result, setResult] = useState<PolicyDecision | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [stats, setStats] = useState({ size: 0, ttlMs: 0 });

  useEffect(() => {
    updateStats();
    // Periodically update cache stats
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateStats = () => {
    try {
      const engine = policyClient.getEngineInstance();
      const cache = (engine as any).cache; // Direct access for dev tools
      if (cache) {
        setStats(cache.getStats());
      }
    } catch (e) {
      // Ignore during initial load
    }
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      const req: ActionRequest = JSON.parse(requestJson);
      const decision = await policyClient.evaluate(req);
      setResult(decision);
      updateStats();
    } catch (err) {
      console.error(err);
      setResult({
        decision: 'Deny',
        matchedPolicies: [],
        explanation: 'Invalid JSON request or evaluation error.',
        evaluatedRules: 0,
        executionTimeMs: 0
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const loadScenario = (scenario: any) => {
    setRequestJson(JSON.stringify(scenario.request, null, 2));
    setResult(null);
  };

  return (
    <div className="flex h-full text-white bg-[#0f0f0f]">
      {/* Sidebar: Scenarios */}
      <div className="w-64 border-r border-subtle flex flex-col bg-[#0a0a0a]">
        <div className="p-4 border-b border-subtle">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
            <Save className="w-3.5 h-3.5" /> Scenarios
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {SCENARIOS.map(s => (
            <button
              key={s.name}
              onClick={() => loadScenario(s)}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-white/5 transition-colors mb-1 text-gray-300 hover:text-white"
            >
              {s.name}
            </button>
          ))}
        </div>
        
        {/* Diagnostics Mini Panel */}
        <div className="p-4 border-t border-subtle bg-[#111]">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Cache Metrics
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Cached Entries:</span>
              <span className="font-mono text-primary">{stats.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">TTL:</span>
              <span className="font-mono">{stats.ttlMs / 1000}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Simulation Builder */}
        <div className="h-1/2 border-b border-subtle flex flex-col">
          <div className="p-3 border-b border-subtle bg-[#111] flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" /> Action Request
            </h3>
            <button
              onClick={handleEvaluate}
              disabled={isEvaluating}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" /> {isEvaluating ? 'Evaluating...' : 'Evaluate Policy'}
            </button>
          </div>
          <div className="flex-1 relative">
            <textarea
              className="absolute inset-0 w-full h-full bg-[#0a0a0a] text-gray-300 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              value={requestJson}
              onChange={e => setRequestJson(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Evaluation Results */}
        <div className="h-1/2 flex flex-col bg-[#0f0f0f]">
          <div className="p-3 border-b border-subtle bg-[#111]">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Evaluation Trace
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {!result ? (
              <div className="h-full flex items-center justify-center text-muted flex-col gap-3">
                <Search className="w-8 h-8 opacity-20" />
                <p>Run an evaluation to see policy decisions.</p>
              </div>
            ) : (
              <div className="max-w-3xl space-y-6">
                
                {/* Decision Header */}
                <div className={`p-4 rounded-lg border flex items-start gap-4 ${
                  result.decision === 'Allow' ? 'bg-emerald-500/10 border-emerald-500/20' :
                  result.decision === 'AllowWithWarning' ? 'bg-amber-500/10 border-amber-500/20' :
                  result.decision === 'RequireApproval' ? 'bg-blue-500/10 border-blue-500/20' :
                  'bg-red-500/10 border-red-500/20'
                }`}>
                  <div className="mt-1">
                    {result.decision === 'Allow' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> :
                     result.decision === 'AllowWithWarning' ? <AlertTriangle className="w-6 h-6 text-amber-500" /> :
                     result.decision === 'RequireApproval' ? <Shield className="w-6 h-6 text-blue-500" /> :
                     <XCircle className="w-6 h-6 text-red-500" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-1">{result.decision}</h2>
                    <p className="text-sm text-gray-300">{result.explanation}</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#111] border border-subtle rounded p-4">
                    <h4 className="text-xs font-semibold text-muted uppercase mb-3 flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Matched Policies</h4>
                    {result.matchedPolicies.length > 0 ? (
                      <div className="space-y-2">
                        {result.matchedPolicies.map((p: string) => (
                          <div key={p} className="text-sm font-mono bg-black/30 p-2 rounded border border-white/5">{p}</div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted italic">No specific policies matched.</p>
                    )}
                  </div>

                  <div className="bg-[#111] border border-subtle rounded p-4">
                    <h4 className="text-xs font-semibold text-muted uppercase mb-3 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Trace Details</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between"><span className="text-muted">Evaluated Rules:</span> <span className="font-mono">{result.evaluatedRules}</span></li>
                      <li className="flex justify-between"><span className="text-muted">Execution Time:</span> <span className="font-mono text-emerald-400">{result.executionTimeMs}ms</span></li>
                    </ul>
                  </div>
                </div>

                {/* Warnings & Suggestions */}
                {(result.warnings || result.suggestedAlternatives) && (
                  <div className="space-y-4">
                    {result.warnings?.map((w: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 p-3 rounded border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {w}
                      </div>
                    ))}
                    {result.suggestedAlternatives?.map((s: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-blue-400 text-sm bg-blue-500/10 p-3 rounded border border-blue-500/20">
                        <ChevronRight className="w-4 h-4 shrink-0" /> Alternative: {s}
                      </div>
                    ))}
                  </div>
                )}
                
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
