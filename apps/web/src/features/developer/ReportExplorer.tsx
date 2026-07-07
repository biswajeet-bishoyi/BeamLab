import React, { useState } from 'react';
import { BookOpen, Search, FileText, CheckCircle, Clock, Link, Activity } from 'lucide-react';

export const ReportExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'templates' | 'citations' | 'audit'>('evidence');

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-700/50 p-4">
        <BookOpen className="h-5 w-5 text-indigo-400" />
        <h2 className="text-lg font-semibold text-slate-100">Report Explorer</h2>
        <span className="ml-auto flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-400">
          <Activity className="h-4 w-4" />
          Active Agent
        </span>
      </div>

      <div className="flex border-b border-slate-700/50 px-4">
        <button
          onClick={() => setActiveTab('evidence')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'evidence'
              ? 'border-indigo-400 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Evidence
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'border-indigo-400 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('citations')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'citations'
              ? 'border-indigo-400 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Citations
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'audit'
              ? 'border-indigo-400 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit Trail
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Collected Evidence</h3>
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-slate-400" />
                <span className="text-sm">Found 24 items mapped to structural analysis run SA-102.</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Template Registry</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
                <FileText className="h-6 w-6 text-indigo-400 mb-2" />
                <h4 className="font-medium text-slate-200">Standard Analysis</h4>
                <p className="text-sm text-slate-400">Default BeamLab Template</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'citations' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Citation Graph</h3>
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
              <div className="flex items-center gap-3">
                <Link className="h-5 w-5 text-slate-400" />
                <span className="text-sm">Tracing 18 statements back to IS 800 standards.</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Engineering Audit Trail</h3>
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-slate-200">Execution SA-102</h4>
                  <p className="text-xs text-slate-400">Mapped to paragraph 4.1 in standard report</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-indigo-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-slate-200">Review Passed</h4>
                  <p className="text-xs text-slate-400">All evidence verified by pipeline</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
