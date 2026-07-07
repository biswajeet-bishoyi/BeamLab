import React, { useState } from 'react';
import { Cpu, Activity, Clock, ShieldAlert, CheckCircle2, PlayCircle, Settings, HardDrive } from 'lucide-react';

export const AgentDiagnostics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'manifest' | 'metrics' | 'sandbox'>('overview');

  // Simulated data for A8
  const mockAgent = {
    id: 'structural-analyzer-1',
    name: 'Structural Analyzer',
    status: 'Idle',
    healthScore: 98,
    metrics: {
      executions: 142,
      failures: 2,
      avgDuration: '450ms',
      peakMemory: '42MB'
    },
    capabilities: {
      domains: ['structural'],
      tasks: ['analysis'],
      objectTypes: ['beam', 'column']
    },
    sandbox: {
      isolation: 'LocalSandboxProvider',
      timeoutMs: 5000,
      cancellable: true,
      telemetry: true
    }
  };

  return (
    <div className="h-full flex text-sm text-gray-300">
      {/* Sidebar - Agent List */}
      <div className="w-64 border-r border-subtle bg-[#111] overflow-y-auto">
        <div className="p-4 border-b border-subtle">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Active Agents</h3>
        </div>
        <div className="p-2 space-y-1">
          <button className="w-full text-left px-3 py-2 rounded bg-primary/10 border border-primary/20 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white text-sm">{mockAgent.name}</span>
              <div className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {mockAgent.status}
              </div>
            </div>
            <span className="text-[10px] text-muted font-mono">{mockAgent.id}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a]">
        <div className="h-14 border-b border-subtle px-6 flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium text-white">{mockAgent.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted">
              <Activity className="w-4 h-4 text-primary" />
              Health: <span className="text-green-400 font-mono">{mockAgent.healthScore}%</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-[#1a1a1a] p-1 rounded-lg border border-[#222]">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${activeTab === 'overview' ? 'bg-[#333] text-white' : 'hover:text-white'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('manifest')}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${activeTab === 'manifest' ? 'bg-[#333] text-white' : 'hover:text-white'}`}
            >
              Manifest
            </button>
            <button 
              onClick={() => setActiveTab('sandbox')}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${activeTab === 'sandbox' ? 'bg-[#333] text-white' : 'hover:text-white'}`}
            >
              Sandbox Context
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#111] border border-subtle rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted mb-2"><PlayCircle className="w-4 h-4"/> Executions</div>
                  <div className="text-2xl text-white font-mono">{mockAgent.metrics.executions}</div>
                </div>
                <div className="bg-[#111] border border-subtle rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted mb-2"><ShieldAlert className="w-4 h-4"/> Failures</div>
                  <div className="text-2xl text-red-400 font-mono">{mockAgent.metrics.failures}</div>
                </div>
                <div className="bg-[#111] border border-subtle rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted mb-2"><Clock className="w-4 h-4"/> Avg Duration</div>
                  <div className="text-2xl text-white font-mono">{mockAgent.metrics.avgDuration}</div>
                </div>
                <div className="bg-[#111] border border-subtle rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted mb-2"><HardDrive className="w-4 h-4"/> Peak Memory</div>
                  <div className="text-2xl text-white font-mono">{mockAgent.metrics.peakMemory}</div>
                </div>
              </div>

              {/* Execution Trace (Mock) */}
              <div className="bg-[#111] border border-subtle rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-subtle bg-[#151515] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="font-medium text-white">Recent Traces</h3>
                </div>
                <div className="divide-y divide-subtle">
                  <div className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <div>
                        <div className="text-white text-sm">Analyze Roof Truss</div>
                        <div className="text-xs text-muted font-mono mt-1">exec_a7f92b4</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">420ms</div>
                      <div className="text-xs text-muted mt-1">2 mins ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div className="bg-[#111] border border-subtle rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-subtle bg-[#151515] flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-white">Agent Capabilities</h3>
              </div>
              <div className="p-6">
                <pre className="font-mono text-sm text-primary/80 overflow-x-auto">
                  {JSON.stringify(mockAgent.capabilities, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'sandbox' && (
            <div className="bg-[#111] border border-subtle rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-subtle bg-[#151515] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-white">Sandbox Context</h3>
              </div>
              <div className="p-6">
                <pre className="font-mono text-sm text-green-400/80 overflow-x-auto">
                  {JSON.stringify(mockAgent.sandbox, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
