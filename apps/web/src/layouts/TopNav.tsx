import React from 'react';
import { Layers, Globe, Mic, Brain, Clock, Printer, BookOpen, Users, Hammer, Boxes, Compass, Activity, Wind, Trees } from 'lucide-react';
import { useStore } from '../store';

export const TopNav: React.FC = () => {
  const {
    setView,
    activeEnvironment,
    setEnvGalleryOpen,
    setPresentationMode,
    setAiStudioOpen,
    setCopilotStudioOpen,
    setPlaybackMode,
    setExportStudioOpen,
    setCodeStudioOpen,
    setCollaborationStudioOpen,
    setConnectionStudioOpen,
    setConcreteStudioOpen,
    setBimInteropStudioOpen,
    setFoundationStudioOpen,
    setSeismicStudioOpen,
    setWindStudioOpen,
    setTimberStudioOpen,
  } = useStore(state => ({
    setView: state.setView,
    activeEnvironment: state.activeEnvironment,
    setEnvGalleryOpen: state.setEnvGalleryOpen,
    setPresentationMode: state.setPresentationMode,
    setAiStudioOpen: state.setAiStudioOpen,
    setCopilotStudioOpen: state.setCopilotStudioOpen,
    setPlaybackMode: state.setPlaybackMode,
    setExportStudioOpen: state.setExportStudioOpen,
    setCodeStudioOpen: state.setCodeStudioOpen,
    setCollaborationStudioOpen: state.setCollaborationStudioOpen,
    setConnectionStudioOpen: state.setConnectionStudioOpen,
    setConcreteStudioOpen: state.setConcreteStudioOpen,
    setBimInteropStudioOpen: state.setBimInteropStudioOpen,
    setFoundationStudioOpen: state.setFoundationStudioOpen,
    setSeismicStudioOpen: state.setSeismicStudioOpen,
    setWindStudioOpen: state.setWindStudioOpen,
    setTimberStudioOpen: state.setTimberStudioOpen,
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
          onClick={() => setCopilotStudioOpen(true)}
          className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-950 font-bold flex items-center gap-2 text-sm"
        >
          <Brain size={16} /> Copilot Studio
        </button>
        <button 
          onClick={() => setAiStudioOpen(true)}
          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg transition-all shadow-sm font-semibold flex items-center gap-2 text-sm"
        >
          <Brain size={16} /> AI Chat
        </button>
        <button 
          onClick={() => setCollaborationStudioOpen(true)}
          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg transition-all shadow-md font-bold flex items-center gap-2 text-sm border border-emerald-400/30"
          title="Open Collaborative Multi-User Session Studio & Team Hub"
        >
          <div className="relative flex items-center">
            <Users size={16} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <span>Team Hub</span>
          <span className="px-1.5 py-0.5 text-[10px] bg-emerald-950/80 text-emerald-300 rounded font-mono border border-emerald-500/30">
            3 Online
          </span>
        </button>
        <button 
          onClick={() => setCodeStudioOpen(true)}
          className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg transition-all shadow-sm font-bold flex items-center gap-2 text-sm"
          title="Open Design Code Intelligence & Clause Inspector Studio"
        >
          <BookOpen size={16} /> Design Codes
        </button>
        <button 
          onClick={() => setConnectionStudioOpen(true)}
          className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg transition-all shadow-md font-bold flex items-center gap-2 text-sm border border-indigo-400/30"
          title="Open 3D Steel Connection Studio & Detailing Engine"
        >
          <Hammer size={16} />
          <span>Connections</span>
        </button>
        <button 
          onClick={() => setConcreteStudioOpen(true)}
          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg transition-all shadow-md font-bold flex items-center gap-2 text-sm border border-amber-400/30"
          title="Open 3D Reinforced Concrete (RC) Studio & P-M-M Engine"
        >
          <Boxes size={16} />
          <span>Concrete RC</span>
        </button>
        <button 
          onClick={() => setBimInteropStudioOpen(true)}
          className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-lg transition-all shadow-md font-bold flex items-center gap-2 text-sm border border-cyan-400/30"
          title="Open BIM & Structural Interoperability Studio (IFC4 & SAF)"
        >
          <Compass size={16} />
          <span>BIM Interop</span>
        </button>
        <button 
          onClick={() => setFoundationStudioOpen(true)}
          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-lg transition-all shadow-md font-bold flex items-center gap-2 text-sm border border-amber-400/30"
          title="Open 3D Foundation & Geotechnical Soil-Structure Interaction Studio"
        >
          <Layers size={16} />
          <span>Foundations</span>
        </button>
        <button 
          onClick={() => setSeismicStudioOpen(true)}
          className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:from-rose-500 hover:to-red-500 text-white rounded-lg transition-all shadow-md font-bold flex items-center gap-2 text-sm border border-rose-400/30"
          title="Open 3D Seismic Dynamics & Time-History Studio (MRSA, CQC, Newmark-β, Drift & Torsion)"
        >
          <Activity size={16} />
          <span>Seismic</span>
        </button>
        <button 
          onClick={() => setWindStudioOpen(true)}
          className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-lg transition-all shadow-md font-bold flex items-center gap-2 text-sm border border-sky-400/30"
          title="Open 3D Wind Aerodynamics & Structural Wind Engineering Studio (ASCE 7-22, Eurocode 1, IS 875, Gust, Vortex, Comfort)"
        >
          <Wind size={16} />
          <span>Wind</span>
        </button>
        <button 
          onClick={() => setTimberStudioOpen(true)}
          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg transition-all shadow-md font-bold flex items-center gap-2 text-sm border border-emerald-400/30"
          title="Open Mass Timber & CLT Aerodynamics Studio (Glulam, CLT, EYM Fasteners, Fire Charring)"
        >
          <Trees size={16} />
          <span>Timber</span>
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
