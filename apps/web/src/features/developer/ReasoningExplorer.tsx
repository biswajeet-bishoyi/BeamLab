
import { Network, Activity, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

export function ReasoningExplorer() {
  return (
    <div className="flex-1 overflow-auto bg-[#0A0A0B] p-6 text-white font-mono text-sm">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Network className="w-5 h-5 text-purple-400" />
            Engineering Reasoning
          </h2>
          <p className="text-muted text-xs mb-6">Cross-Agent Reasoning Trace & Evidence Inspector</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Confidence Breakdown */}
          <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Confidence Breakdown
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-muted">Overall Confidence</span>
                <span className="text-emerald-400 font-bold">87%</span>
              </div>
              <details className="cursor-pointer group">
                <summary className="flex justify-between items-center text-xs text-white/80 hover:text-white">
                  <span>Knowledge</span>
                  <span className="text-emerald-400">95%</span>
                </summary>
                <div className="pl-4 mt-2 text-xs text-muted">
                  <p>Matched authoritative knowledge (AISC Steel Construction Manual).</p>
                </div>
              </details>
              <details className="cursor-pointer group">
                <summary className="flex justify-between items-center text-xs text-white/80 hover:text-white">
                  <span>Solver</span>
                  <span className="text-emerald-400">80%</span>
                </summary>
                <div className="pl-4 mt-2 text-xs text-muted">
                  <p>Mock solver used. Expected standard linear static variance.</p>
                </div>
              </details>
              <details className="cursor-pointer group">
                <summary className="flex justify-between items-center text-xs text-white/80 hover:text-white">
                  <span>Model</span>
                  <span className="text-yellow-400">63%</span>
                </summary>
                <div className="pl-4 mt-2 text-xs text-muted">
                  <p>Boundary conditions incomplete or highly idealized.</p>
                </div>
              </details>
            </div>
          </div>

          {/* Justification Viewer */}
          <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              Engineering Justification
            </h3>
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                <p className="text-blue-100 font-medium">
                  "The proposed structural configuration meets all ultimate and serviceability limit states under current assumptions."
                </p>
              </div>
              
              <div>
                <h4 className="text-muted mb-1 font-semibold">Supported By</h4>
                <ul className="list-disc list-inside text-white/80 space-y-1">
                  <li>AISC Steel Construction Manual</li>
                  <li>Eurocode 3 Deflection Limits</li>
                  <li>Solver displacement output</li>
                </ul>
              </div>

              <div>
                <h4 className="text-muted mb-1 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  Limitations & Assumptions
                </h4>
                <ul className="list-disc list-inside text-white/80 space-y-1">
                  <li>Dynamic wind effects not considered.</li>
                  <li>Connection stiffness assumed pinned.</li>
                  <li>Small deformations, linear elastic material.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Narrative Viewer */}
        <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Engineering Narrative
          </h3>
          <div className="prose prose-invert prose-sm max-w-none text-white/80">
            <p>
              The structure exhibits predictable linear elastic behavior under the applied load cases.
              The maximum bending moment occurs near mid-span because the beam behaves as a simply supported member under predominantly uniformly distributed loading.
            </p>
            <p>
              The observed deflection is consistent with the current flexural stiffness, although a larger section may reduce serviceability concerns. Non-linear effects may become significant if the load increases by 20%.
            </p>
            <h4 className="text-white mt-4 font-semibold">Recommendations:</h4>
            <ul className="list-disc list-inside">
              <li>Increase section size for critically loaded members.</li>
              <li>Run buckling analysis on slender columns.</li>
              <li>Check connection detailing.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
