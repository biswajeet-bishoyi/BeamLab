import React, { useState } from 'react';
import { Search, Network, Database, X, BookOpen, AlertCircle } from 'lucide-react';
import { knowledgeClient } from '../../store/knowledge';
import type { ClientRetrievalResult } from '@beamlab/knowledge-client';

export const KnowledgeExplorer: React.FC<{ onClose: () => void, isEmbedded?: boolean }> = ({ onClose, isEmbedded }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientRetrievalResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ClientRetrievalResult | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await knowledgeClient.search({ query });
      setResults(res);
      setSelectedResult(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const stats = knowledgeClient.getEngineStats();

  return (
    <div className={isEmbedded ? "flex h-full text-white bg-[#0f0f0f]" : "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8"}>
      <div className={isEmbedded ? "w-full h-full flex flex-col" : "bg-[#111111] border border-subtle rounded-xl w-full max-w-6xl h-[80vh] flex flex-col shadow-2xl overflow-hidden"}>
        
        {/* Header */}
        {!isEmbedded && (
          <div className="h-14 border-b border-subtle flex items-center justify-between px-6 bg-panel shrink-0">
            <div className="flex items-center gap-3 text-accent">
              <Database className="w-5 h-5" />
              <h2 className="font-semibold text-primary">Knowledge Explorer <span className="text-xs text-amber-500 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">DEV MODE</span></h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-xs text-muted flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Platform Active • Cache Size: {stats.size}/{stats.maxItems}
              </div>
              <button onClick={onClose} className="p-1 text-muted hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Search & Results */}
          <div className="w-1/3 border-r border-subtle flex flex-col bg-[#161616]">
            <div className="p-4 border-b border-subtle">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search knowledge..." 
                  className="w-full bg-[#0a0a0a] border border-subtle rounded-md pl-9 pr-3 py-2 text-sm text-primary focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isSearching ? (
                <div className="text-center text-muted text-sm mt-8">Retrieving knowledge...</div>
              ) : results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((r, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedResult(r)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedResult === r ? 'bg-accent/10 border-accent/50' : 'bg-[#111111] border-subtle hover:border-accent/30'}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-mono text-muted">{r.item.id}</span>
                        <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">{(r.confidence * 100).toFixed(0)}% Match</span>
                      </div>
                      <h4 className="text-sm font-medium text-primary mb-1">{r.item.title}</h4>
                      <p className="text-xs text-muted line-clamp-2">{r.item.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted text-sm mt-8 flex flex-col items-center opacity-50">
                  <BookOpen className="w-8 h-8 mb-2" />
                  <p>Query the Engineering Knowledge Platform</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Inspection */}
          <div className="flex-1 overflow-y-auto bg-[#0a0a0a] custom-scrollbar p-6">
            {selectedResult ? (
              <div className="max-w-3xl animate-in fade-in">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-primary mb-2">{selectedResult.item.title}</h1>
                    <div className="flex gap-2">
                      <span className="text-xs bg-panel border border-subtle px-2 py-1 rounded text-muted">{selectedResult.item.category}</span>
                      <span className="text-xs bg-panel border border-subtle px-2 py-1 rounded text-muted">{selectedResult.item.engineeringDomain}</span>
                      <span className="text-xs bg-panel border border-subtle px-2 py-1 rounded text-muted">Diff: {selectedResult.item.difficulty}</span>
                    </div>
                  </div>
                </div>

                <div className="prose prose-invert prose-sm max-w-none mb-8">
                  <p className="text-base text-gray-300">{selectedResult.item.summary}</p>
                  <p className="text-muted leading-relaxed">{selectedResult.item.detailedExplanation}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-[#111111] border border-subtle rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2"><Search className="w-3 h-3" /> Retrieval Rationale</h3>
                    <p className="text-sm text-primary mb-2">{selectedResult.rationale}</p>
                    <p className="text-xs text-muted">Confidence: {(selectedResult.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-[#111111] border border-subtle rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2"><AlertCircle className="w-3 h-3" /> Metadata & Versioning</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted">Source:</span><span className="text-primary">{selectedResult.item.source}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Status:</span><span className="text-green-400">{selectedResult.item.version.reviewStatus}</span></div>
                      <div className="flex justify-between"><span className="text-muted">K-Version:</span><span className="text-primary">{selectedResult.item.version.knowledgeVersion}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Updated:</span><span className="text-primary">{new Date(selectedResult.item.version.updatedAt).toLocaleDateString()}</span></div>
                    </div>
                  </div>
                </div>

                {selectedResult.relatedKnowledge.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2"><Network className="w-3 h-3" /> Graph Context (Related Knowledge)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedResult.relatedKnowledge.map((rk: any) => (
                        <div key={rk.id} className="bg-[#111111] border border-subtle rounded p-3">
                          <span className="text-[10px] font-mono text-muted block mb-1">{rk.id}</span>
                          <h4 className="text-sm font-medium text-primary mb-1">{rk.title}</h4>
                          <p className="text-xs text-muted truncate">{rk.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted">
                Select a result to inspect its internal representation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
