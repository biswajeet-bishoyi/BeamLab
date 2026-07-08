import React, { useState } from 'react';
import { Shield, Database, X, Terminal, Layers, Cpu, Activity, Network, PenTool, Target, BookOpen, GitBranch } from 'lucide-react';
import { KnowledgeExplorer } from './KnowledgeExplorer';
import { PolicyExplorer } from './PolicyExplorer';
import { ResourceExplorer } from './ResourceExplorer';
import { AgentDiagnostics } from './AgentDiagnostics';
import { MemoryExplorer } from './MemoryExplorer';
import { StructuralAnalysisExplorer } from './StructuralAnalysisExplorer';
import { SolverExplorer } from './SolverExplorer';
import { ReasoningExplorer } from './ReasoningExplorer';
import { DesignExplorer } from './DesignExplorer';
import { OptimizationExplorer } from './OptimizationExplorer';
import { ComplianceExplorer } from './ComplianceExplorer';
import { ReportExplorer } from './ReportExplorer';
import { WorkflowExplorer } from './WorkflowExplorer';
import { ModelExplorer } from './ModelExplorer';

export const DeveloperStudio: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'policy' | 'knowledge' | 'resource' | 'agent' | 'memory' | 'analysis' | 'solver' | 'reasoning' | 'design' | 'optimization' | 'compliance' | 'report' | 'workflow' | 'model'>('agent');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
      <div className="bg-[#0a0a0a] border border-[#222] rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="h-14 border-b border-subtle flex items-center justify-between px-4 shrink-0 bg-[#0f0f0f]">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-primary">Developer Studio</h2>
              <p className="text-[10px] text-muted font-mono tracking-wider">BEAMLAB // DIAGNOSTICS</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('agent')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'agent' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Agent Diagnostics
            </button>
            <button 
              onClick={() => setActiveTab('policy')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'policy' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Shield className="w-3.5 h-3.5" />
              Policy Explorer
            </button>
            <button 
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'knowledge' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Database className="w-3.5 h-3.5" />
              Knowledge Explorer
            </button>
            <button 
              onClick={() => setActiveTab('resource')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'resource' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              Resource Explorer
            </button>
            <button 
              onClick={() => setActiveTab('memory')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'memory' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Database className="w-3.5 h-3.5" />
              Memory Explorer
            </button>
            <button 
              onClick={() => setActiveTab('workflow')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'workflow' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Workflow
            </button>
            <button 
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'design' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Design
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'analysis' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Analysis
            </button>
            <button 
              onClick={() => setActiveTab('solver')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'solver' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Activity className="w-3.5 h-3.5" />
              Solver Runtime
            </button>
            <button 
              onClick={() => setActiveTab('reasoning')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'reasoning' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Network className="w-3.5 h-3.5" />
              Reasoning
            </button>
            <button 
              onClick={() => setActiveTab('optimization')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'optimization' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Target className="w-3.5 h-3.5" />
              Optimization
            </button>
            <button 
              onClick={() => setActiveTab('compliance')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'compliance' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Shield className="w-3.5 h-3.5" />
              Compliance
            </button>
            <button 
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'report' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Report
            </button>
            <button 
              onClick={() => setActiveTab('model')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'model' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted hover:text-white border border-transparent'}`}
            >
              <Database className="w-3.5 h-3.5" />
              Model
            </button>
            <div className="w-px h-4 bg-subtle mx-2" />
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 rounded text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'agent' && <AgentDiagnostics />}
          {activeTab === 'policy' && <PolicyExplorer />}
          {activeTab === 'knowledge' && <KnowledgeExplorer onClose={onClose} isEmbedded={true} />}
          {activeTab === 'resource' && <ResourceExplorer />}
          {activeTab === 'memory' && <MemoryExplorer />}
          {activeTab === 'design' && <DesignExplorer />}
          {activeTab === 'analysis' && <StructuralAnalysisExplorer />}
          {activeTab === 'solver' && <SolverExplorer />}
          {activeTab === 'reasoning' && <ReasoningExplorer />}
          {activeTab === 'optimization' && <OptimizationExplorer />}
          {activeTab === 'compliance' && <ComplianceExplorer />}
          {activeTab === 'report' && <ReportExplorer />}
          {activeTab === 'workflow' && <WorkflowExplorer />}
          {activeTab === 'model' && <ModelExplorer />}
        </div>
      </div>
    </div>
  );
};
