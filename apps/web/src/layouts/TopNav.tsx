import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Globe,
  Mic,
  Brain,
  Clock,
  Printer,
  BookOpen,
  Users,
  Hammer,
  Boxes,
  Compass,
  Activity,
  Wind,
  Trees,
  Building2,
  Spline,
  Truck,
  Cable,
  Grid,
  Mountain,
  Bomb,
  Server,
  ChevronDown,
  Sparkles,
  FileCode,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
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
    setCompositeStudioOpen,
    setPrestressedStudioOpen,
    setBridgeStudioOpen,
    setCableStudioOpen,
    setPlateShellStudioOpen,
    setEarthStudioOpen,
    setBlastStudioOpen,
    setSolveFarmStudioOpen,
  } = useStore(
    useShallow(state => ({
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
      setCompositeStudioOpen: state.setCompositeStudioOpen,
      setPrestressedStudioOpen: state.setPrestressedStudioOpen,
      setBridgeStudioOpen: state.setBridgeStudioOpen,
      setCableStudioOpen: state.setCableStudioOpen,
      setPlateShellStudioOpen: state.setPlateShellStudioOpen,
      setEarthStudioOpen: state.setEarthStudioOpen,
      setBlastStudioOpen: state.setBlastStudioOpen,
      setSolveFarmStudioOpen: state.setSolveFarmStudioOpen,
    }))
  );

  const [activeDropdown, setActiveDropdown] = useState<'studios' | 'codes' | 'ai' | 'export' | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name: 'studios' | 'codes' | 'ai' | 'export') => {
    setActiveDropdown(prev => (prev === name ? null : name));
  };

  const closeDropdown = () => setActiveDropdown(null);

  return (
    <header
      ref={navRef}
      className="h-14 border-b border-slate-800 bg-[#0c1017]/95 backdrop-blur-md flex items-center justify-between px-5 shrink-0 relative z-50 select-none shadow-sm"
    >
      {/* ── LEFT: Logo & Project Context ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView('dashboard')}
          className="flex items-center gap-2.5 text-white hover:text-blue-400 transition-colors group"
          title="Return to Dashboard"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">BeamLab</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">Engineering Workspace</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
            PRO
          </span>
        </div>
      </div>

      {/* ── CENTER: Clean Dropdown Suites ── */}
      <div className="flex items-center gap-1.5">
        {/* 1. Engineering Studios Mega-Menu */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('studios')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeDropdown === 'studios'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-blue-400" />
            <span>Specialized Studios</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${activeDropdown === 'studios' ? 'rotate-180 text-blue-400' : ''}`}
            />
          </button>

          {activeDropdown === 'studios' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[720px] p-4 rounded-xl bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 shadow-2xl grid grid-cols-3 gap-4 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* Column 1: Structural Materials */}
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1 border-b border-slate-800 flex items-center justify-between">
                  <span>Materials & Design</span>
                  <span className="text-[9px] text-slate-500">5 Engines</span>
                </div>
                <button
                  onClick={() => { setConcreteStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20">
                    <Boxes className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-amber-300">Concrete RC</div>
                    <div className="text-[10px] text-slate-500">P-M-M interaction & 3D detailing</div>
                  </div>
                </button>
                <button
                  onClick={() => { setConnectionStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20">
                    <Hammer className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-indigo-300">Steel Connections</div>
                    <div className="text-[10px] text-slate-500">Bolted, welded & moment bases</div>
                  </div>
                </button>
                <button
                  onClick={() => { setTimberStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20">
                    <Trees className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-emerald-300">Mass Timber & CLT</div>
                    <div className="text-[10px] text-slate-500">Glulam, EYM fasteners & charring</div>
                  </div>
                </button>
                <button
                  onClick={() => { setCompositeStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-cyan-300">Steel-Concrete Composite</div>
                    <div className="text-[10px] text-slate-500">AISC 360, EC4, studs & vibration</div>
                  </div>
                </button>
                <button
                  onClick={() => { setPrestressedStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20">
                    <Spline className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-amber-300">Prestressed / PT</div>
                    <div className="text-[10px] text-slate-500">Tendon drape, losses & balancing</div>
                  </div>
                </button>
              </div>

              {/* Column 2: Dynamics, Extreme & Geotech */}
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1 border-b border-slate-800 flex items-center justify-between">
                  <span>Extreme & Geotechnical</span>
                  <span className="text-[9px] text-slate-500">5 Engines</span>
                </div>
                <button
                  onClick={() => { setSeismicStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:bg-rose-500/20">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-rose-300">Seismic Dynamics</div>
                    <div className="text-[10px] text-slate-500">MRSA, CQC, time-history & drift</div>
                  </div>
                </button>
                <button
                  onClick={() => { setWindStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:bg-sky-500/20">
                    <Wind className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-sky-300">Wind Aerodynamics</div>
                    <div className="text-[10px] text-slate-500">ASCE 7, EC1, gust & vortex</div>
                  </div>
                </button>
                <button
                  onClick={() => { setBlastStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 group-hover:bg-red-500/20">
                    <Bomb className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-red-300">Blast & Impact</div>
                    <div className="text-[10px] text-slate-500">Kingery-Bulmash & SDOF collapse</div>
                  </div>
                </button>
                <button
                  onClick={() => { setFoundationStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 group-hover:bg-yellow-500/20">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-yellow-300">3D Foundations</div>
                    <div className="text-[10px] text-slate-500">Soil-structure interaction & piles</div>
                  </div>
                </button>
                <button
                  onClick={() => { setEarthStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-stone-500/10 text-stone-300 border border-stone-500/20 group-hover:bg-stone-500/20">
                    <Mountain className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-stone-200">Earth / Shoring</div>
                    <div className="text-[10px] text-slate-500">Retaining walls & slope stability</div>
                  </div>
                </button>
              </div>

              {/* Column 3: Continuum & Infrastructure */}
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1 border-b border-slate-800 flex items-center justify-between">
                  <span>Continuum & Scale</span>
                  <span className="text-[9px] text-slate-500">4 Engines</span>
                </div>
                <button
                  onClick={() => { setPlateShellStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:bg-teal-500/20">
                    <Grid className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-teal-300">Plate & Shell FEM</div>
                    <div className="text-[10px] text-slate-500">MITC4 Mindlin-Reissner continuum</div>
                  </div>
                </button>
                <button
                  onClick={() => { setBridgeStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-blue-300">Bridge Moving Loads</div>
                    <div className="text-[10px] text-slate-500">AASHTO, Eurocode LM1 & Müller-Breslau</div>
                  </div>
                </button>
                <button
                  onClick={() => { setCableStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-500/20">
                    <Cable className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-purple-300">Cable & Tension</div>
                    <div className="text-[10px] text-slate-500">Exact catenary kinematics & tuning</div>
                  </div>
                </button>
                <button
                  onClick={() => { setSolveFarmStudioOpen(true); closeDropdown(); }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
                >
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20">
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-emerald-300">Cloud Solve Farm</div>
                    <div className="text-[10px] text-slate-500">Distributed FETI & Python SDK</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Codes & BIM Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('codes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeDropdown === 'codes'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Codes & BIM</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${activeDropdown === 'codes' ? 'rotate-180 text-blue-400' : ''}`}
            />
          </button>

          {activeDropdown === 'codes' && (
            <div className="absolute top-full left-0 mt-2 w-64 p-2 rounded-xl bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 shadow-2xl flex flex-col gap-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => { setCodeStudioOpen(true); closeDropdown(); }}
                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
              >
                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-medium text-slate-200 group-hover:text-blue-300">Design Code Inspector</div>
                  <div className="text-[10px] text-slate-500">AISC, ACI, Eurocodes, IS 800</div>
                </div>
              </button>
              <button
                onClick={() => { setBimInteropStudioOpen(true); closeDropdown(); }}
                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
              >
                <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-medium text-slate-200 group-hover:text-teal-300">BIM Interop (IFC4 & SAF)</div>
                  <div className="text-[10px] text-slate-500">Revit, Tekla & structural exchange</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 3. Archie Intelligence Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeDropdown === 'ai'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>Archie AI</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${activeDropdown === 'ai' ? 'rotate-180 text-purple-400' : ''}`}
            />
          </button>

          {activeDropdown === 'ai' && (
            <div className="absolute top-full left-0 mt-2 w-64 p-2 rounded-xl bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 shadow-2xl flex flex-col gap-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => { setCopilotStudioOpen(true); closeDropdown(); }}
                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
              >
                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-medium text-slate-200 group-hover:text-purple-300">Copilot Studio</div>
                  <div className="text-[10px] text-slate-500">Multi-agent orchestrator & execution</div>
                </div>
              </button>
              <button
                onClick={() => { setAiStudioOpen(true); closeDropdown(); }}
                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/90 text-left transition-colors group"
              >
                <div className="p-1.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-medium text-slate-200 group-hover:text-white">Engineering AI Chat</div>
                  <div className="text-[10px] text-slate-500">Direct conversational reasoning</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Collaboration, Context, Export ── */}
      <div className="flex items-center gap-2">
        {/* Context Toggle */}
        <button
          onClick={() => setEnvGalleryOpen(true)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
            activeEnvironment !== 'none'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle Environmental Layer Context"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{activeEnvironment !== 'none' ? 'Context Active' : 'Context'}</span>
        </button>

        {/* Team Hub Pill */}
        <button
          onClick={() => setCollaborationStudioOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-all shadow-sm"
          title="Open Collaborative Multi-User Session Studio"
        >
          <div className="relative flex items-center">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <span>Team</span>
          <span className="px-1 py-0.2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 rounded border border-emerald-500/20">
            3
          </span>
        </button>

        {/* Share & Export Menu */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('export')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeDropdown === 'export'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export & Share</span>
            <ChevronDown className="w-3 h-3 text-blue-200" />
          </button>

          {activeDropdown === 'export' && (
            <div className="absolute top-full right-0 mt-2 w-56 p-2 rounded-xl bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 shadow-2xl flex flex-col gap-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => { setExportStudioOpen(true); closeDropdown(); }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-left text-slate-200 font-medium transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Export PDF / Calcs</span>
              </button>
              <button
                onClick={() => { setPresentationMode(true); closeDropdown(); }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-left text-slate-200 font-medium transition-colors"
              >
                <Mic className="w-3.5 h-3.5 text-purple-400" />
                <span>Presentation Mode</span>
              </button>
              <button
                onClick={() => { setPlaybackMode(true); closeDropdown(); }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-left text-slate-200 font-medium transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Time Machine Replay</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
