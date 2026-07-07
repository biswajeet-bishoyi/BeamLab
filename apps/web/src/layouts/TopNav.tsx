import React from 'react';
import { Layers, Globe, Mic, Brain, Clock, Printer } from 'lucide-react';
import { useStore } from '../store';

export const TopNav: React.FC = () => {
  const {
    setView,
    activeEnvironment,
    setEnvGalleryOpen,
    setPresentationMode,
    setAiStudioOpen,
    setPlaybackMode,
    setExportStudioOpen,
  } = useStore(state => ({
    setView: state.setView,
    activeEnvironment: state.activeEnvironment,
    setEnvGalleryOpen: state.setEnvGalleryOpen,
    setPresentationMode: state.setPresentationMode,
    setAiStudioOpen: state.setAiStudioOpen,
    setPlaybackMode: state.setPlaybackMode,
    setExportStudioOpen: state.setExportStudioOpen,
  }));

  return (
    <header className="h-16 border-b border-subtle bg-panel flex items-center justify-between px-6 shrink-0 relative z-50">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('dashboard')}
          className="flex items-center gap-2 text-accent font-bold text-lg hover:opacity-80 transition-opacity"
        >
          <Layers className="w-6 h-6" />
          <span>BeamLab</span>
        </button>
        <div className="h-6 w-px bg-subtle mx-2" />
        <span className="text-sm text-primary font-medium">Engineering Workspace</span>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setEnvGalleryOpen(true)}
          className={`px-4 py-1.5 rounded-lg transition-all font-bold flex items-center gap-2 text-sm shadow-sm ${
            activeEnvironment !== 'none'
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
              : 'bg-subtle hover:bg-accent text-primary'
          }`}
        >
          <Globe size={16} /> {activeEnvironment !== 'none' ? 'Context On' : 'Context'}
        </button>
        <button 
          onClick={() => setPresentationMode(true)}
          className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-lg transition-all shadow-sm font-bold flex items-center gap-2 text-sm"
        >
          <Mic size={16} /> Present
        </button>
        <button 
          onClick={() => setAiStudioOpen(true)}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-sm font-bold flex items-center gap-2 text-sm"
        >
          <Brain size={16} /> AI Studio
        </button>
        <button 
          onClick={() => setPlaybackMode(true)}
          className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-900 rounded-lg transition-all shadow-sm font-bold flex items-center gap-2 text-sm"
        >
          <Clock size={16} /> Time Machine
        </button>
        <button 
          onClick={() => setExportStudioOpen(true)}
          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
        >
          <Printer size={16} /> Export
        </button>
      </div>
    </header>
  );
};
