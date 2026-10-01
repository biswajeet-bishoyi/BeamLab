import React, { useState, useMemo } from 'react';
import {
  Server,
  Cpu,
  Activity,
  HardDrive,
  Play,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  Zap,
  Network,
  Share2,
  Box,
  Layers,
  Database,
  Sliders,
  TrendingDown,
} from 'lucide-react';
import {
  ClusterManager,
  DomainDecompositionEngine,
  WorkerNode,
  SolverAlgorithm,
  JobPriority,
  ConvergenceIterationMetric,
} from '@beamlab/solve-farm';
import { useStore } from '../../store';

interface SolveFarmStudioProps {
  onClose: () => void;
}

export type FarmTab = 'cluster' | 'decomposition' | 'python-sdk';

export const SolveFarmStudio: React.FC<SolveFarmStudioProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<FarmTab>('cluster');
  const { model } = useStore();

  // Cluster State & Manager
  const [workers, setWorkers] = useState<WorkerNode[]>([
    {
      id: 'worker-us-east-1a',
      hostname: 'farm-node-01.beamlab.cloud',
      region: 'us-east-1',
      status: 'idle',
      cpuCores: 64,
      gpuType: 'NVIDIA H100 (80GB)',
      totalMemoryMB: 262144,
      usedMemoryMB: 18432,
      supportedSolvers: ['direct-sparse', 'pcg-iterative', 'schur-complement-feti'],
      heartbeatTimestamp: Date.now(),
    },
    {
      id: 'worker-us-east-1b',
      hostname: 'farm-node-02.beamlab.cloud',
      region: 'us-east-1',
      status: 'busy',
      cpuCores: 64,
      gpuType: 'NVIDIA H100 (80GB)',
      totalMemoryMB: 262144,
      usedMemoryMB: 184320,
      supportedSolvers: ['direct-sparse', 'schur-complement-feti'],
      activeJobId: 'job-9821-shell-mitc4',
      heartbeatTimestamp: Date.now(),
    },
    {
      id: 'worker-eu-west-1a',
      hostname: 'farm-node-03.beamlab.cloud',
      region: 'eu-west-1',
      status: 'idle',
      cpuCores: 32,
      totalMemoryMB: 131072,
      usedMemoryMB: 8192,
      supportedSolvers: ['pcg-iterative', 'newton-raphson-nonlinear'],
      heartbeatTimestamp: Date.now(),
    },
    {
      id: 'worker-ap-southeast-1a',
      hostname: 'farm-node-04.beamlab.cloud',
      region: 'ap-southeast-1',
      status: 'idle',
      cpuCores: 128,
      gpuType: 'NVIDIA A100 (80GB)',
      totalMemoryMB: 524288,
      usedMemoryMB: 32768,
      supportedSolvers: ['direct-sparse', 'explicit-dynamics-central-diff'],
      heartbeatTimestamp: Date.now(),
    },
  ]);

  // Decomposition parameters
  const [numSubdomains, setNumSubdomains] = useState<number>(4);
  const [selectedSolver, setSelectedSolver] = useState<SolverAlgorithm>('schur-complement-feti');
  const [priority, setPriority] = useState<JobPriority>('interactive');
  const [targetTolerance, setTargetTolerance] = useState<number>(1e-6);

  // Simulation execution state
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solveProgress, setSolveProgress] = useState<number>(100);
  const [residuals, setResiduals] = useState<ConvergenceIterationMetric[]>([
    { step: 1, iteration: 1, residualNorm: 1.0, displacementNorm: 0.12, energyNorm: 1.0, isConverged: false, timestampMs: 12 },
    { step: 1, iteration: 2, residualNorm: 0.28, displacementNorm: 0.045, energyNorm: 0.08, isConverged: false, timestampMs: 25 },
    { step: 1, iteration: 3, residualNorm: 0.041, displacementNorm: 0.008, energyNorm: 0.0016, isConverged: false, timestampMs: 38 },
    { step: 1, iteration: 4, residualNorm: 0.0032, displacementNorm: 0.0006, energyNorm: 1.0e-5, isConverged: false, timestampMs: 51 },
    { step: 1, iteration: 5, residualNorm: 1.4e-5, displacementNorm: 2.1e-6, energyNorm: 2.0e-10, isConverged: false, timestampMs: 65 },
    { step: 1, iteration: 6, residualNorm: 4.8e-8, displacementNorm: 8.4e-10, energyNorm: 2.3e-15, isConverged: true, timestampMs: 78 },
  ]);

  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Domain decomposition computation using @beamlab/solve-farm
  const decompositionStats = useMemo(() => {
    // 2x2 interior vs 2x2 boundary sample
    const K_II = [
      [200.0, -100.0],
      [-100.0, 200.0],
    ];
    const K_IB = [
      [-50.0, 0.0],
      [0.0, -50.0],
    ];
    const K_BB = [
      [150.0, -30.0],
      [-30.0, 150.0],
    ];
    const f_I = [10.0, 20.0];
    const f_B = [5.0, 5.0];

    const result = DomainDecompositionEngine.computeSchurComplement({
      K_II,
      K_IB,
      K_BB,
      f_I,
      f_B,
    });

    const totalDofs = 48000;
    const interfaceDofs = Math.round(totalDofs * 0.08 * Math.sqrt(numSubdomains));
    const interiorDofs = totalDofs - interfaceDofs;
    const speedup = (Math.pow(numSubdomains, 0.85)).toFixed(2);

    return {
      totalDofs,
      interfaceDofs,
      interiorDofs,
      speedup,
      schurSample: result.schurMatrix,
    };
  }, [numSubdomains]);

  // Generate Python SDK script corresponding to current structural workspace model
  const generatedPythonCode = useMemo(() => {
    const spanM = typeof model?.span === 'number' ? model.span : 10.0;
    const ePa = model?.material?.E ?? 200e9;
    const aM2 = model?.section?.area ?? 0.005;
    const iM4 = model?.section?.momentOfInertia ?? 0.0001;

    return `"""
BeamLab Scientific SDK - Cloud Distributed Solve Script
Auto-generated from active workspace model
"""

from beamlab import Model, Node, Member, SolveFarmClient
import numpy as np

# 1. Initialize Frame Model
model = Model(name="Cloud Solve Farm Model")

# 2. Define Nodes
n1 = model.add_node(x=0.0, y=0.0, fixed=[True, True, True])
n2 = model.add_node(x=${(spanM / 2).toFixed(2)}, y=0.0, fixed=[False, False, False])
n3 = model.add_node(x=${spanM.toFixed(2)}, y=0.0, fixed=[True, True, False])

# 3. Define Structural Members
# Steel E = ${ePa / 1e9} GPa, Area = ${aM2} m², I = ${iM4} m⁴
model.add_member(start_node=n1, end_node=n2, A=${aM2}, I=${iM4}, E=${ePa})
model.add_member(start_node=n2, end_node=n3, A=${aM2}, I=${iM4}, E=${ePa})

# 4. Apply Distributed & Nodal Loads
model.add_nodal_load(node=n2, fy=-150000.0)  # -150 kN midspan point load

# 5. Connect to Cloud Solve Farm & Submit Job
client = SolveFarmClient(endpoint_url="https://farm.beamlab.cloud", api_key="live_sec_token")

print("Submitting substructured solve to Cloud Farm...")
job_id = client.submit_job(
    payload=model.to_dict(),
    priority=1,
    subdomains=${numSubdomains},
    solver_type="${selectedSolver.toUpperCase()}"
)
print(f"Dispatched Job ID: {job_id}")

# 6. Stream Convergence Residuals in Real-Time
for event in client.stream_residuals(job_id):
    print(f"Iteration {event['iteration']}: Residual = {event['residual']:.4e}, time = {event['time_ms']}ms")

# 7. Retrieve Solved Results
results = client.get_result(job_id)
print("Solve Completed Successfully!")
print(f"Peak Deflection: {results.get('max_displacement', 0.0) * 1000:.2f} mm")
`;
  }, [model, numSubdomains, selectedSolver]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedPythonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRunSimulation = () => {
    setIsSolving(true);
    setSolveProgress(10);

    const timer1 = setTimeout(() => setSolveProgress(45), 250);
    const timer2 = setTimeout(() => setSolveProgress(85), 550);
    const timer3 = setTimeout(() => {
      setSolveProgress(100);
      setIsSolving(false);
      // Update worker busy status
      setWorkers(prev =>
        prev.map(w =>
          w.id === 'worker-us-east-1a'
            ? { ...w, status: 'idle', activeJobId: undefined }
            : w
        )
      );
    }, 850);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  const totalCores = workers.reduce((acc, w) => acc + w.cpuCores, 0);
  const totalGpus = workers.filter(w => w.gpuType).length;
  const idleNodes = workers.filter(w => w.status === 'idle').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-cyan-800/40 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl shadow-cyan-950/40 text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border-b border-cyan-800/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                  Cloud Solve Farm & Python Scientific Orchestrator
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                  Sprint B22
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Parallel Subdomain Condensation, FETI Schur Complement Solver & Automated Python Pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {idleNodes}/{workers.length} Nodes Idle
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> {totalCores} vCPUs
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> {totalGpus} GPUs
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('cluster')}
            className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'cluster'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-4 h-4" /> Cluster Topology ({workers.length} Nodes)
          </button>
          <button
            onClick={() => setActiveTab('decomposition')}
            className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'decomposition'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" /> Domain Decomposition & FETI
          </button>
          <button
            onClick={() => setActiveTab('python-sdk')}
            className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'python-sdk'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" /> Python Scientific SDK
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'cluster' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Active Worker Cluster Nodes</h3>
                  <p className="text-xs text-slate-400">Distributed multi-tenant computing farm with heartbeat telemetry</p>
                </div>
                <button
                  onClick={handleRunSimulation}
                  disabled={isSolving}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950 transition-all"
                >
                  <Play className="w-4 h-4" />
                  {isSolving ? 'Dispatching & Solving...' : 'Dispatch Test Cluster Workload'}
                </button>
              </div>

              {/* Workers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workers.map(w => {
                  const memUsedGb = (w.usedMemoryMB / 1024).toFixed(1);
                  const memTotalGb = (w.totalMemoryMB / 1024).toFixed(0);
                  const memPct = Math.round((w.usedMemoryMB / w.totalMemoryMB) * 100);

                  return (
                    <div
                      key={w.id}
                      className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-5 transition-all shadow-md"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${w.status === 'busy' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                            <HardDrive className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-slate-200">{w.hostname}</h4>
                            <span className="text-xs text-slate-400">{w.region} • {w.id}</span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                            w.status === 'busy'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU Allocation</span>
                          <span className="font-medium text-white">{w.cpuCores} Cores ({w.status === 'busy' ? '88%' : '4%'} load)</span>
                        </div>

                        {w.gpuType && (
                          <div className="flex justify-between text-slate-300">
                            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Accelerator</span>
                            <span className="font-medium text-amber-300">{w.gpuType}</span>
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span>RAM Usage: {memUsedGb} GB / {memTotalGb} GB</span>
                            <span>{memPct}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                memPct > 80 ? 'bg-amber-500' : 'bg-cyan-500'
                              }`}
                              style={{ width: `${memPct}%` }}
                            />
                          </div>
                        </div>

                        {w.activeJobId && (
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-400">
                            <span>Running Job:</span>
                            <code className="px-2 py-0.5 bg-slate-950 rounded text-cyan-300 font-mono text-xs">
                              {w.activeJobId}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'decomposition' && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Subdomains Count: {numSubdomains}
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={16}
                    step={2}
                    value={numSubdomains}
                    onChange={e => setNumSubdomains(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <span className="text-[11px] text-slate-500">Number of partitions in FETI solver</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Solver Algorithm
                  </label>
                  <select
                    value={selectedSolver}
                    onChange={e => setSelectedSolver(e.target.value as SolverAlgorithm)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="schur-complement-feti">FETI Schur Complement</option>
                    <option value="direct-sparse">Direct Sparse Cholesky</option>
                    <option value="pcg-iterative">Preconditioned CG</option>
                    <option value="explicit-dynamics-central-diff">Explicit Central Difference</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Job Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as JobPriority)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="interactive">Interactive (P0 - Instant)</option>
                    <option value="standard">Standard (P1 - Fast)</option>
                    <option value="batch">Batch (P2 - Off-peak)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Residual Target Tol
                  </label>
                  <input
                    type="number"
                    step="1e-7"
                    value={targetTolerance}
                    onChange={e => setTargetTolerance(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Subdomain Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400">Total System DOFs</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {decompositionStats.totalDofs.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400">Interface Boundary DOFs</span>
                  <div className="text-xl font-bold text-cyan-400 mt-1">
                    {decompositionStats.interfaceDofs.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400">Interior Eliminated DOFs</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {decompositionStats.interiorDofs.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400">Theoretical Parallel Speedup</span>
                  <div className="text-xl font-bold text-amber-400 mt-1">
                    {decompositionStats.speedup}x
                  </div>
                </div>
              </div>

              {/* Convergence History Residual Trace */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-cyan-400" />
                    Iteration Convergence Residual History (log10 scale)
                  </h4>
                  <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Converged in 6 Iterations
                  </span>
                </div>

                <div className="space-y-2">
                  {residuals.map(r => {
                    const logRes = Math.log10(r.residualNorm);
                    // normalize from -8 to 0 => 0% to 100%
                    const barWidth = Math.max(5, Math.min(100, ((logRes + 8) / 8) * 100));

                    return (
                      <div key={r.iteration} className="flex items-center gap-3 text-xs">
                        <span className="w-20 text-slate-400 font-mono">Iter #{r.iteration}</span>
                        <div className="flex-1 bg-slate-950 rounded-full h-4 overflow-hidden p-0.5 border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="w-24 text-right font-mono text-cyan-300">
                          {r.residualNorm.toExponential(2)}
                        </span>
                        <span className="w-16 text-right text-slate-500 font-mono">{r.timestampMs}ms</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'python-sdk' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">BeamLab Python Scientific SDK Code Generator</h3>
                  <p className="text-xs text-slate-400">
                    Self-contained Python script to programmatically control, automate, or solve this model on the cloud farm
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedCode ? 'Copied to Clipboard!' : 'Copy Python Code'}
                  </button>
                </div>
              </div>

              {/* Code display */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">model_solve_farm.py</span>
                  <span className="text-slate-500">Python 3.10+ / beamlab-sdk</span>
                </div>
                <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed max-h-[450px]">
                  {generatedPythonCode}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
