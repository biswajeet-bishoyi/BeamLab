import { useState, useEffect } from 'react';
import { useStore } from './store';
import { BeamCanvas } from './components/BeamCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { EngineeringInspector } from './components/EngineeringInspector';
import { ResultsStudio } from './components/ResultsStudio';
import { EngineeringIntelligencePanel } from './components/EngineeringIntelligencePanel';
import { TimeMachineOverlay } from './components/replay/TimeMachineOverlay';
import { AIEngineeringStudio } from './components/AIEngineeringStudio';
import { EnvironmentLayer } from './components/environments/EnvironmentLayer';
import { EnvironmentGallery } from './components/environments/EnvironmentGallery';
import { PresentationMode } from './components/presentation/PresentationMode';
import { Dashboard } from './components/Dashboard';
import { PerformanceOverlay } from './components/PerformanceOverlay';
import { Gallery } from './components/Gallery';
import { LeftToolbox } from './components/LeftToolbox';
import { StatusBar } from './components/StatusBar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Printer, 
  Sun, 
  Moon,
  HardHat,
  Home,
  Brain,
  Globe,
  Mic,
  Clock
} from 'lucide-react';
import './App.css';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [playbackMode, setPlaybackMode] = useState(false);
  const [aiStudioMode, setAiStudioMode] = useState(false);
  const [envGalleryOpen, setEnvGalleryOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const currentView = useStore((state) => state.currentView);
  const setView = useStore((state) => state.setView);
  const activeEnvironment = useStore((state) => state.activeEnvironment);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // If in Dashboard view, return the dedicated Dashboard component
  if (currentView === 'dashboard') {
    return (
      <div className={`h-screen w-screen overflow-hidden transition-colors duration-300 font-sans ${theme}`}>
        <Dashboard />
        
        {/* Theme toggle for Dashboard */}
        <button 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="absolute top-6 right-6 z-[100] p-3 rounded-full glass-panel hover:scale-110 transition-transform shadow-lg"
        >
          {theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-yellow-400" />}
        </button>
      </div>
    );
  }

  // Gallery View
  if (currentView === 'gallery') {
    return (
      <div className={`h-screen w-screen overflow-hidden transition-colors duration-300 font-sans ${theme}`}>
        <Gallery />
        <button 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="absolute top-6 right-6 z-[100] p-3 rounded-full glass-panel hover:scale-110 transition-transform shadow-lg"
        >
          {theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-yellow-400" />}
        </button>
      </div>
    );
  }

  // Workspace View (Engineering Canvas)
  return (
    <div className={`h-screen w-screen overflow-hidden bg-blueprint transition-colors duration-300 font-sans ${theme}`}>
      
      {/* TOP NAVIGATION BAR */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between glass-panel rounded-2xl px-6 py-3 border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors text-slate-700 dark:text-slate-200"
            title="Back to Dashboard"
          >
            <Home size={20} />
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600"></div>
          <div className="bg-yellow-400 p-2 rounded-xl text-black">
            <HardHat size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            BeamLab
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            onClick={() => setEnvGalleryOpen(true)}
            className={`px-5 py-2 rounded-xl transition-all font-bold flex items-center gap-2 shadow-md ${
              activeEnvironment !== 'none'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
                : 'bg-slate-700 hover:bg-slate-600 text-white dark:bg-slate-700'
            }`}
          >
            <Globe size={18} /> {activeEnvironment !== 'none' ? 'Context On' : 'Context'}
          </button>
          <button 
            onClick={() => setPresentationMode(true)}
            className="px-6 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl transition-all shadow-md font-bold flex items-center gap-2 shadow-fuchsia-500/30"
          >
            <Mic size={18} /> Present
          </button>
          <button 
            onClick={() => setAiStudioMode(true)}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md font-bold flex items-center gap-2 shadow-indigo-500/30"
          >
            <Brain size={18} /> AI Studio
          </button>
          <button 
            onClick={() => setPlaybackMode(true)}
            className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-900 rounded-xl transition-all shadow-md font-bold flex items-center gap-2 shadow-orange-500/30"
          >
            <Clock size={18} /> Time Machine
          </button>
          <button className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-xl transition-colors font-medium flex items-center gap-2">
            <Printer size={18} /> Export
          </button>
        </div>
      </motion.header>

      {/* LEFT TOOLBOX */}
      <LeftToolbox />

      {/* CENTER CANVAS (Full Screen minus padding) */}
      <div className="absolute inset-0 pt-24 pb-8 pl-24 pr-96 flex flex-col pointer-events-none z-10 custom-scrollbar overflow-y-auto">
        <EngineeringInspector />
        
        {/* Beam Preview Area — environment layer sits behind canvas */}
        <div className="w-full h-[400px] shrink-0 flex items-center justify-center pointer-events-auto relative">
          <EnvironmentLayer environmentId={activeEnvironment} />
          <BeamCanvas />
        </div>
        
        {/* Interactive Diagram System */}
        <div className="w-full flex-1 pointer-events-auto flex justify-center pb-32">
          <ResultsStudio />
        </div>
      </div>

      {/* RIGHT INSPECTOR PANEL */}
      <motion.div 
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute right-4 top-24 bottom-12 w-80 flex flex-col gap-4 z-40"
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4 glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10 space-y-6">
            <PropertiesPanel />
          </div>
          
          {/* Engineering Intelligence Panel */}
          <div className="shrink-0 p-4 relative z-10 border-t border-slate-200/50 dark:border-slate-800/50">
            <EngineeringIntelligencePanel />
          </div>
        </div>
      </motion.div>

      {/* BOTTOM STATUS BAR */}
      <StatusBar />

      {/* ENVIRONMENT GALLERY */}
      <AnimatePresence>
        {envGalleryOpen && (
          <EnvironmentGallery onClose={() => setEnvGalleryOpen(false)} />
        )}
      </AnimatePresence>

      {/* AI ENGINEERING STUDIO OVERLAY */}
      <AnimatePresence>
        {aiStudioMode && (
          <AIEngineeringStudio onClose={() => setAiStudioMode(false)} />
        )}
      </AnimatePresence>

      {/* TIME MACHINE OVERLAY */}
      <AnimatePresence>
        {playbackMode && (
          <TimeMachineOverlay onClose={() => setPlaybackMode(false)} />
        )}
      </AnimatePresence>

      {/* PRESENTATION MODE OVERLAY */}
      <AnimatePresence>
        {presentationMode && (
          <PresentationMode onClose={() => setPresentationMode(false)} />
        )}
      </AnimatePresence>

      {/* Global Overlays */}
      <PerformanceOverlay />
    </div>
  );
}
