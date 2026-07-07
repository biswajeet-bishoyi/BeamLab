import { PenTool, Target, FileText, CheckCircle, AlertTriangle, Layers } from 'lucide-react';

export function DesignExplorer() {
  return (
    <div className="flex-1 overflow-auto bg-[#0A0A0B] p-6 text-white font-mono text-sm">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-fuchsia-400" />
            Structural Design Agent
          </h2>
          <p className="text-muted text-xs mb-6">Intent Analysis, Alternative Generation, and Constructability Review</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Intent Viewer */}
          <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-400" />
              Design Intent
            </h3>
            <div className="space-y-3 text-xs text-white/80">
              <div className="flex justify-between border-b border-white/10 pb-1">
                <span className="text-muted">Primary Goals</span>
                <span className="text-right">Maximize open space, Minimize weight</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1">
                <span className="text-muted">Serviceability</span>
                <span className="text-right">L/360 Live Load</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1">
                <span className="text-muted">Economy Priority</span>
                <span className="text-orange-400 font-bold">High</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-muted">Constructability Priority</span>
                <span className="text-orange-400 font-bold">Medium</span>
              </div>
            </div>
          </div>

          {/* Alternative Viewer */}
          <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Top Alternatives
            </h3>
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-blue-100 font-bold">1. Efficiency Baseline</span>
                  <span className="text-emerald-400 font-mono">Score: 0.92</span>
                </div>
                <p className="text-white/70 mb-2">W12x26 | A992 Steel</p>
                <p className="text-muted italic">Trade-off: Higher material cost per ton, but lower overall tonnage.</p>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/90 font-bold">2. Constructability Focused</span>
                  <span className="text-emerald-400 font-mono">Score: 0.85</span>
                </div>
                <p className="text-white/70 mb-2">W14x22 | A36 Steel</p>
                <p className="text-muted italic">Trade-off: Lower headroom requirement but increased overall steel weight.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Constructability Review */}
          <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Constructability Review
            </h3>
            <div className="space-y-3 text-xs text-white/80">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Medium Risk (Installation)</p>
                  <p className="text-muted">Selected section depth may require coped connections at primary girders.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 mt-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Low Risk (Transportation)</p>
                  <p className="text-muted">Members fit within standard legal transport limits.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Design Narrative Viewer */}
          <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Design Narrative
            </h3>
            <div className="prose prose-invert prose-sm max-w-none text-white/80">
              <p>
                The structural design has been evaluated to prioritize economy and open floor space.
              </p>
              <h4 className="text-white font-semibold mt-2">Recommended Direction:</h4>
              <p className="text-emerald-400">
                Proceed with the Efficiency Baseline alternative, using W12x26 sections in A992 steel.
              </p>
              <h4 className="text-white font-semibold mt-4">Next Steps:</h4>
              <ul className="list-disc list-inside">
                <li>Run final structural analysis.</li>
                <li>Execute AISC Code Compliance Agent.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
