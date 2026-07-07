import React, { useState } from 'react';
import './MemoryExplorer.css';

interface MockSnapshot {
  id: string;
  namespace: string;
  version: number;
  schemaVersion: number;
  createdAt: number;
}

const mockSnapshots: MockSnapshot[] = [
  { id: 'snap-1', namespace: 'beamlab.memory.sessions', version: 1, schemaVersion: 1, createdAt: Date.now() - 100000 },
  { id: 'snap-2', namespace: 'beamlab.workspace.layout', version: 3, schemaVersion: 2, createdAt: Date.now() - 50000 },
];

export const MemoryExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scopes' | 'snapshots' | 'metrics'>('scopes');

  return (
    <div className="memory-explorer">
      <div className="explorer-header">
        <h2>Agent Memory System Explorer</h2>
        <div className="explorer-tabs">
          <button 
            className={`tab-btn ${activeTab === 'scopes' ? 'active' : ''}`}
            onClick={() => setActiveTab('scopes')}
          >
            Scopes & Sessions
          </button>
          <button 
            className={`tab-btn ${activeTab === 'snapshots' ? 'active' : ''}`}
            onClick={() => setActiveTab('snapshots')}
          >
            Snapshot Registry
          </button>
          <button 
            className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            Metrics & Health
          </button>
        </div>
      </div>

      <div className="explorer-content">
        {activeTab === 'scopes' && (
          <div className="scopes-view">
            <h3>Active Scopes</h3>
            <div className="scope-list">
              <div className="scope-card">
                <h4>Session Memory</h4>
                <p>Provider: LocalStorageProvider</p>
                <p>Entries: 12</p>
              </div>
              <div className="scope-card">
                <h4>Workspace Memory</h4>
                <p>Provider: LocalStorageProvider</p>
                <p>Entries: 4</p>
              </div>
              <div className="scope-card">
                <h4>Execution Memory</h4>
                <p>Provider: InMemoryProvider</p>
                <p>Entries: 0</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'snapshots' && (
          <div className="snapshots-view">
            <h3>Snapshot Registry</h3>
            <table className="snapshot-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Namespace</th>
                  <th>Snapshot Version</th>
                  <th>Schema Version</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {mockSnapshots.map(snap => (
                  <tr key={snap.id}>
                    <td>{snap.id}</td>
                    <td>{snap.namespace}</td>
                    <td>v{snap.version}</td>
                    <td>v{snap.schemaVersion}</td>
                    <td>{new Date(snap.createdAt).toLocaleTimeString()}</td>
                    <td><button className="btn-sm">Inspect</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="metrics-view">
            <h3>Memory Health & Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-box">
                <div className="metric-value">1,240</div>
                <div className="metric-label">Total Reads</div>
              </div>
              <div className="metric-box">
                <div className="metric-value">385</div>
                <div className="metric-label">Total Writes</div>
              </div>
              <div className="metric-box">
                <div className="metric-value">98.2%</div>
                <div className="metric-label">Cache Hit Rate</div>
              </div>
              <div className="metric-box">
                <div className="metric-value">14</div>
                <div className="metric-label">Active Snapshots</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
