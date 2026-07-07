import React, { useState, useEffect } from 'react';
import { Database, Search, Layers, Server, Activity, Book } from 'lucide-react';
import { resourceClient } from '../../store/resource';
import type { Resource } from '@beamlab/resource-manager';

export const ResourceExplorer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Resource<any>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource<any> | null>(null);
  const [stats, setStats] = useState({ size: 0, hits: 0, misses: 0, hitRate: 0 });

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateStats = () => {
    try {
      const engine = resourceClient.getEngineInstance();
      setStats(engine.getCacheStats());
    } catch (e) {}
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const res = await resourceClient.search({ query: query.trim() || undefined });
      setResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex h-full text-white bg-[#0f0f0f]">
      {/* Sidebar: Categories & Search */}
      <div className="w-80 border-r border-subtle flex flex-col bg-[#0a0a0a]">
        <div className="p-4 border-b border-subtle">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search resources (e.g. ISMB, M20)..." 
              className="w-full bg-[#111] border border-subtle rounded pl-9 pr-3 py-2 text-sm text-primary focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {isSearching ? (
            <div className="text-center text-muted text-sm mt-8">Searching ERM...</div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedResource(r)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex flex-col ${selectedResource?.id === r.id ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-primary">{r.name}</span>
                    <span className="text-[10px] text-muted bg-white/5 px-1 rounded">{r.type}</span>
                  </div>
                  <span className="text-xs text-muted truncate">{r.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted text-sm mt-8 flex flex-col items-center opacity-50">
              <Layers className="w-8 h-8 mb-2" />
              <p>Execute a search to view resources.</p>
            </div>
          )}
        </div>

        {/* ERM Diagnostics */}
        <div className="p-4 border-t border-subtle bg-[#111]">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Cache Metrics
          </h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-muted">Cached Entries:</span>
              <span className="text-primary">{stats.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Hit Rate:</span>
              <span className={stats.hitRate > 0.5 ? 'text-green-400' : 'text-amber-400'}>
                {(stats.hitRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Resource Inspector */}
      <div className="flex-1 flex flex-col bg-[#0f0f0f] overflow-y-auto custom-scrollbar p-6">
        {selectedResource ? (
          <div className="max-w-4xl animate-in fade-in space-y-6">
            <div className="flex items-start justify-between border-b border-subtle pb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                    {selectedResource.type}
                  </span>
                  <span className="text-xs font-mono text-muted">{selectedResource.id}</span>
                </div>
                <h1 className="text-2xl font-bold text-primary mb-1">{selectedResource.name}</h1>
                <p className="text-gray-400">{selectedResource.description}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted mb-1">Version <span className="font-mono text-primary">{selectedResource.version.version}</span></div>
                <div className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded inline-block">
                  {selectedResource.version.status}
                </div>
              </div>
            </div>

            {/* Properties Schema View */}
            <div className="bg-[#111] border border-subtle rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-subtle bg-black/20 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold">Typed Properties</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted uppercase bg-black/40 border-b border-subtle">
                    <tr>
                      <th className="px-4 py-2 font-medium">Property</th>
                      <th className="px-4 py-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedResource.properties).map(([key, value]) => (
                      <tr key={key} className="border-b border-subtle last:border-0 hover:bg-white/5">
                        <td className="px-4 py-2.5 font-mono text-gray-300">{key}</td>
                        <td className="px-4 py-2.5 text-primary">
                          {typeof value === 'boolean' ? (value ? 'True' : 'False') : String(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Metadata & Origin */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111] border border-subtle rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Book className="w-3.5 h-3.5" /> Source Metadata
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Source:</span>
                    <span className="text-primary">{selectedResource.metadata.source}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap mt-2">
                    {selectedResource.metadata.tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#111] border border-subtle rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Server className="w-3.5 h-3.5" /> Provider Details
                </h3>
                <div className="text-sm text-gray-400">
                  Resource was resolved from the active provider registry.
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted">
            Select a resource from the registry to inspect its schema and properties.
          </div>
        )}
      </div>
    </div>
  );
};
