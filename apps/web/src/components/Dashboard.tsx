import { motion } from 'framer-motion';
import { useStore, initialModel } from '../store';
import { PRESETS } from './Gallery';
import { 
  Plus, 
  FolderOpen, 
  Library, 
  Bot, 
  Settings,
  HardHat,
  ArrowRight,
  Sparkles 
} from 'lucide-react';
import { useState } from 'react';
import type { StructuralModel } from '@beamworks/core-engine/model/types';
import { toLength, toForce, toForcePerLength } from '@beamworks/core-engine/units/brands';

export function Dashboard() {
  const setView = useStore(state => state.setView);
  const setAiStudioOpen = useStore(state => state.setAiStudioOpen);
  const loadPreset = useStore(state => state.loadPreset);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateBeam = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    setAiError(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setAiError("Please add VITE_GEMINI_API_KEY to your .env.local file.");
      setIsGenerating(false);
      return;
    }

    try {
      const prompt = `You are an expert structural engineer. The user wants to design a beam: "${aiPrompt}".
Generate a JSON object matching this exact schema:
{
  "span": number (in meters),
  "material": { "id": "m1", "name": "Structural Steel (200 GPa)", "E": 200000000000, "density": 7850 },
  "section": { "id": "sec1", "name": "W12x26 (I-Beam)", "area": 0.0049, "momentOfInertia": 0.000085, "height": 0.31 },
  "supports": [ { "id": "string", "type": "pin" | "roller" | "fixed", "position": number } ],
  "loads": [ { "id": "string", "type": "point", "position": number, "magnitude": number (in Newtons, typically negative for downward) } ]
}
Respond with ONLY valid JSON. Do not include markdown formatting like \`\`\`json.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) throw new Error("Invalid response from AI");

      // Strip markdown if it accidentally included it
      const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      const generatedModel: StructuralModel = {
        span: toLength(parsed.span || 10),
        material: parsed.material || { id: 'm1', name: 'Structural Steel (200 GPa)', E: 200000000000, density: 7850 },
        section: parsed.section || { id: 'sec1', name: 'W12x26 (I-Beam)', area: 0.0049, momentOfInertia: 0.000085, height: 0.31 },
        supports: (parsed.supports || []).map((s: any) => ({ ...s, id: s.id || `s-${Math.random()}`, position: toLength(s.position) })),
        loads: (parsed.loads || []).map((l: any) => ({ 
          ...l, 
          id: l.id || `l-${Math.random()}`, 
          position: toLength(l.position || 0), 
          magnitude: l.type === 'distributed' ? toForcePerLength(l.magnitude) : toForce(l.magnitude) 
        }))
      };

      loadPreset(generatedModel);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('HTTP Error') || err.message?.includes('Quota')) {
        setAiError(`API Error: ${err.message}`);
      } else {
        setAiError("Archie failed to understand the request or generated invalid JSON.");
      }
    } finally {
      setIsGenerating(false);
    }
  };
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="absolute inset-0 z-50 bg-[#FAFAFA] dark:bg-[#0A0F1C] overflow-y-auto custom-scrollbar flex flex-col">
      {/* Background Subtle Engineering Grid */}
      <div className="fixed inset-0 bg-blueprint opacity-40 dark:opacity-20 pointer-events-none" style={{ backgroundSize: '60px 60px' }}></div>
      <div className="fixed inset-0 bg-gradient-to-b from-transparent to-white/80 dark:to-[#0A0F1C]/90 pointer-events-none"></div>

      {/* EXPANDED TOP NAVIGATION */}
      <header className="relative z-40 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/30 backdrop-blur-md px-8 py-4 flex items-center justify-between">
        <button 
          onClick={() => setView('dashboard')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
        >
          <div className="bg-yellow-400 p-2 rounded-xl text-slate-900 shadow-inner">
            <HardHat size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            BeamLab
          </h1>
        </button>
        <nav className="hidden xl:flex items-center gap-1">
          <button onClick={() => setView('workspace')} className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md">
            Beam Analysis
          </button>
          <button onClick={() => { setView('workspace'); setAiStudioOpen(true); }} className="px-4 py-2 rounded-full text-sm font-medium transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100">
            AI Studio
          </button>
          <button onClick={() => setView('gallery')} className="px-4 py-2 rounded-full text-sm font-medium transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100">
            Example Library
          </button>
          <a href="https://github.com/beamworks/beamlab" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full text-sm font-medium transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100">
            GitHub
          </a>
        </nav>
        <div className="flex items-center gap-4">
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12 flex flex-col gap-16 w-full">
        
        {/* HERO SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col md:flex-row gap-12 items-center justify-between mt-4"
        >
          <div className="flex flex-col gap-6 max-w-2xl">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              {greeting}. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300">
                Ready to Build?
              </span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 font-light max-w-lg leading-relaxed">
              Design, analyze, visualize, and optimize structural beams with a truly interactive engineering experience.
            </p>
          </div>
          
          {/* Subtle Hero Illustration Area */}
          <div className="hidden md:flex flex-1 justify-end">
            <div className="relative w-72 h-72">
              <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
              {/* Decorative Beam & Compass SVG */}
              <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 drop-shadow-2xl">
                <motion.path 
                  d="M 20 150 L 180 150" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  className="text-slate-800 dark:text-slate-200"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
                <motion.polygon 
                  points="20,150 10,170 30,170" 
                  fill="#3B82F6"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                />
                <motion.circle 
                  cx="180" cy="150" r="8" fill="#3B82F6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: 'spring' }}
                />
                <motion.path 
                  d="M 100 50 L 100 150"
                  stroke="#F59E0B"
                  strokeWidth="4"
                  strokeDasharray="4 4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                />
                <motion.path
                  d="M 90 60 L 100 50 L 110 60"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                />
              </svg>
            </div>
          </div>
        </motion.section>

        {/* QUICK ACTIONS */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <ActionCard 
            icon={<Plus size={28} />} 
            title="New Beam Analysis" 
            desc="Start a blank canvas" 
            color="bg-yellow-400" 
            textColor="text-slate-900"
            onClick={() => {
              loadPreset(initialModel);
              setView('workspace');
            }}
            primary
          />
          <ActionCard 
            icon={<FolderOpen size={28} />} 
            title="Open Beam File" 
            desc="Load a .json workspace" 
            color="bg-slate-100 dark:bg-slate-800"
            textColor="text-slate-800 dark:text-slate-200"
            onClick={() => {}}
          />
          <ActionCard 
            icon={<Library size={28} />} 
            title="Example Library" 
            desc="Explore preset beams" 
            color="bg-slate-100 dark:bg-slate-800"
            textColor="text-slate-800 dark:text-slate-200"
            onClick={() => setView('gallery')}
          />
          <ActionCard 
            icon={<Settings size={28} />} 
            title="Settings" 
            desc="Preferences & theme" 
            color="bg-slate-100 dark:bg-slate-800"
            textColor="text-slate-800 dark:text-slate-200"
            onClick={() => {}}
          />
        </motion.section>

        {/* FEATURED EXAMPLE GALLERY */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col gap-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Library className="text-blue-500" /> Featured Examples
            </h2>
            <button 
              onClick={() => setView('gallery')}
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1 text-sm"
            >
              View All Examples <ArrowRight size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ExampleCard 
              title="Simply Supported Beam"
              desc="A classic 10m beam with a central point load."
              difficulty="Beginner"
              onClick={() => {
                loadPreset(PRESETS[0].model);
                setView('workspace');
              }}
              svg={
                <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200">
                  <path d="M 20 20 L 80 20" stroke="currentColor" strokeWidth="4" />
                  <polygon points="20,20 15,30 25,30" fill="#3B82F6" />
                  <circle cx="80" cy="25" r="5" fill="#3B82F6" />
                  <line x1="50" y1="0" x2="50" y2="15" stroke="#EF4444" strokeWidth="4" markerEnd="url(#arrow)" />
                </svg>
              }
            />
            <ExampleCard 
              title="Cantilever Overhang"
              desc="Fixed support on the left, with an overhang UDL."
              difficulty="Intermediate"
              onClick={() => {
                loadPreset(PRESETS[3].model);
                setView('workspace');
              }}
              svg={
                <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200">
                  <path d="M 20 20 L 80 20" stroke="currentColor" strokeWidth="4" />
                  <rect x="10" y="10" width="10" height="20" fill="#3B82F6" />
                  <rect x="40" y="5" width="40" height="10" fill="rgba(239, 68, 68, 0.2)" stroke="#EF4444" strokeWidth="2" />
                </svg>
              }
            />
            <ExampleCard 
              title="Bridge Girder Design"
              desc="Complex multiple spans with varying loads."
              difficulty="Advanced"
              onClick={() => {
                loadPreset(PRESETS[2].model);
                setView('workspace');
              }}
              svg={
                <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200">
                  <path d="M 10 20 L 90 20" stroke="currentColor" strokeWidth="4" />
                  <polygon points="30,20 25,30 35,30" fill="#3B82F6" />
                  <polygon points="70,20 65,30 75,30" fill="#3B82F6" />
                  <line x1="50" y1="5" x2="50" y2="15" stroke="#EF4444" strokeWidth="4" />
                </svg>
              }
            />
          </div>
        </motion.section>

        {/* AI ASSISTANT CARD & TIPS */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12"
        >
          {/* AI CARD */}
          <div className="col-span-2 p-8 lg:p-10 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative overflow-hidden group shadow-2xl shadow-indigo-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center gap-3 font-bold tracking-widest uppercase text-sm text-indigo-100">
                <Bot size={20} /> Meet Archie AI
              </div>
              <h2 className="text-3xl font-black">Generate a beam instantly.</h2>
              <p className="text-indigo-100 max-w-md leading-relaxed">
                Describe the structure you want to build, and our AI Assistant will configure the geometry, materials, and loads for you automatically.
              </p>
              
              <div className="mt-4 relative group-hover:scale-[1.02] transition-transform">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-indigo-300">
                  <Bot size={24} />
                </div>
                <input 
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateBeam()}
                  disabled={isGenerating}
                  placeholder="e.g. Design a 12m steel continuous beam with supports at 0, 6, and 12m..."
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-indigo-200 rounded-2xl py-5 pl-14 pr-32 outline-none focus:bg-white/20 transition-all shadow-inner disabled:opacity-50"
                />
                <button 
                  onClick={handleGenerateBeam}
                  disabled={isGenerating}
                  className="absolute inset-y-2 right-2 bg-white text-indigo-600 font-bold px-6 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? <Sparkles className="animate-spin" size={18} /> : "Generate"}
                </button>
              </div>
              {aiError && (
                <div className="text-red-200 text-sm font-medium mt-1 bg-red-900/40 p-2 rounded-lg border border-red-500/30 inline-block">
                  {aiError}
                </div>
              )}
            </div>
          </div>

          {/* TIPS SECTION */}
          <div className="p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col gap-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <HardHat className="text-yellow-500" /> Engineering Tips
            </h3>
            <ul className="flex flex-col gap-4">
              <TipItem text="Press 'L' to quickly add a Point Load." />
              <TipItem text="Hover over any reaction arrow to see precise forces." />
              <TipItem text="JSON workspaces save your material properties automatically." />
              <TipItem text="Switch to Cinematic Playback for presentation mode." />
            </ul>
          </div>

        </motion.section>

        {/* FOOTER */}
        <div className="flex justify-center items-center pt-8 pb-4 text-slate-500 dark:text-slate-400 font-medium">
          made by biswajeet ❤️
        </div>

      </div>
    </div>
  );
}

// Subcomponents

function ActionCard({ icon, title, desc, color, textColor, onClick, primary }: any) {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`p-6 rounded-[2rem] cursor-pointer flex flex-col gap-4 shadow-sm hover:shadow-2xl transition-all border ${primary ? 'border-transparent shadow-yellow-500/20' : 'border-slate-200 dark:border-slate-800'} glass-panel relative overflow-hidden group`}
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${color} ${textColor}`}>
        {icon}
      </div>
      <div className="mt-2">
        <h3 className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
      </div>
    </motion.div>
  );
}

function ExampleCard({ title, desc, difficulty, onClick, svg }: any) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      onClick={onClick}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 flex flex-col gap-6 cursor-pointer group hover:shadow-2xl hover:shadow-blue-500/5 transition-all"
    >
      <div className="h-32 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center p-4 border border-slate-100 dark:border-slate-700/50 group-hover:border-blue-500/30 transition-colors relative overflow-hidden">
        <div className="absolute inset-0 bg-blueprint opacity-10"></div>
        {svg}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">{title}</h3>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{difficulty}</span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </motion.div>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
      <span className="leading-relaxed">{text}</span>
    </li>
  );
}
