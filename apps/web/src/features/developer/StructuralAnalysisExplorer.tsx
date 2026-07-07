import React, { useState } from 'react';
import './StructuralAnalysisExplorer.css';

export const StructuralAnalysisExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'validation' | 'planning' | 'reasoning' | 'metrics'>('overview');

  return (
    <div className="structural-analysis-explorer">
      <div className="explorer-header">
        <h2>Structural Analysis Agent Core</h2>
        <div className="explorer-tabs">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`tab-btn ${activeTab === 'validation' ? 'active' : ''}`} onClick={() => setActiveTab('validation')}>Validation Viewer</button>
          <button className={`tab-btn ${activeTab === 'planning' ? 'active' : ''}`} onClick={() => setActiveTab('planning')}>Planning & Strategy</button>
          <button className={`tab-btn ${activeTab === 'reasoning' ? 'active' : ''}`} onClick={() => setActiveTab('reasoning')}>Reasoning & Recommendations</button>
          <button className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`} onClick={() => setActiveTab('metrics')}>Metrics & Trace</button>
        </div>
      </div>

      <div className="explorer-content">
        {activeTab === 'overview' && (
          <div className="overview-view">
            <h3>Agent Status: Online</h3>
            <p>Ready to process engineering reasoning requests.</p>
            <div className="status-grid">
              <div className="status-box">
                <h4>Mock Solver 01</h4>
                <span>Active</span>
              </div>
              <div className="status-box">
                <h4>Validation Rules</h4>
                <span>Loaded</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="validation-view">
            <h3>Validation Viewer</h3>
            <div className="log-box">
              <p>[INFO] Validating Connectivity...</p>
              <p>[INFO] Validating Supports...</p>
              <p>[INFO] Validating Material Assignments...</p>
              <p className="text-success">[SUCCESS] Model is completely valid.</p>
            </div>
          </div>
        )}

        {activeTab === 'planning' && (
          <div className="planning-view">
            <h3>Planning & Strategy Viewer</h3>
            <table className="info-table">
              <tbody>
                <tr><td>Selected Strategy</td><td>Linear Static Analysis</td></tr>
                <tr><td>Required Solver</td><td>mock-solver-01</td></tr>
                <tr><td>Estimated Duration</td><td>1500 ms</td></tr>
                <tr><td>Expected Outputs</td><td>Deflections, Forces, Reactions</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reasoning' && (
          <div className="reasoning-view">
            <h3>Reasoning & Recommendations Viewer</h3>
            <div className="recommendation-card">
              <span className="badge warning">Medium Priority</span>
              <h4>Run Code Compliance</h4>
              <p>Run the code compliance agent to verify standard limits.</p>
            </div>
            <div className="recommendation-card">
              <span className="badge danger">High Priority</span>
              <h4>Optimize Section</h4>
              <p>Consider increasing the moment of inertia for critical members.</p>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="metrics-view">
            <h3>Metrics & Execution Trace</h3>
            <div className="metrics-grid">
              <div className="metric-box">
                <div className="metric-value">45ms</div>
                <div className="metric-label">Avg Validation Time</div>
              </div>
              <div className="metric-box">
                <div className="metric-value">12ms</div>
                <div className="metric-label">Avg Planning Time</div>
              </div>
              <div className="metric-box">
                <div className="metric-value">515ms</div>
                <div className="metric-label">Avg Execution Duration</div>
              </div>
              <div className="metric-box">
                <div className="metric-value">0</div>
                <div className="metric-label">Total Failures</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
