import React, { useState } from 'react';
import { Shield, Database, X, Terminal, Layers } from 'lucide-react';
import { KnowledgeExplorer } from './KnowledgeExplorer';
import { PolicyExplorer } from './PolicyExplorer';
import { ResourceExplorer } from './ResourceExplorer';

export const DeveloperStudio: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'policy' | 'knowledge' | 'resource'>('policy');

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
          
          <div className="flex items-center gap-2">
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
          {activeTab === 'policy' && <PolicyExplorer />}
          {activeTab === 'knowledge' && <KnowledgeExplorer onClose={onClose} isEmbedded={true} />}
          {activeTab === 'resource' && <ResourceExplorer />}
        </div>
      </div>
    </div>
  );
};
