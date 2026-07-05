import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { 
  Brain, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Bot
} from 'lucide-react';
import type { StructuralModel } from '@beamworks/core-engine/model/types';

// --- Heuristic Engine ---

function calculateIntelligence(model: StructuralModel) {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  let completeness = 0;
  if (model.material) completeness += 25;
  if (model.section) completeness += 25;
  if (model.supports.length > 0) completeness += 25;
  if (model.loads.length > 0) completeness += 25;

  let stabilityState = 'Under-Constrained';
  let solverConfidence = 0;

  // Extremely basic stability check for 2D beam (needs at least 1 pin and 1 roller, or 1 fixed)
  const hasFixed = model.supports.some(s => s.type === 'fixed');
  const hasPin = model.supports.some(s => s.type === 'pin');
  const rollerCount = model.supports.filter(s => s.type === 'roller').length;

  if (hasFixed) {
    stabilityState = 'Stable';
  } else if (hasPin && rollerCount >= 1) {
    stabilityState = 'Stable';
  } else if (model.supports.length === 0) {
    stabilityState = 'Floating Mechanism';
    warnings.push('Beam is floating in space.');
    recommendations.push('Add a Pin support and a Roller support to stabilize.');
  } else if (!hasPin && !hasFixed && rollerCount > 0) {
    stabilityState = 'Horizontal Mechanism';
    warnings.push('Beam can move horizontally freely.');
    recommendations.push('Change at least one Roller to a Pin support.');
  } else if (hasPin && rollerCount === 0) {
    stabilityState = 'Rotational Mechanism';
    warnings.push('Beam can rotate freely around the pin.');
    recommendations.push('Add a Roller support to prevent rotation.');
  }

  // Load checks
  if (model.loads.length === 0) {
    warnings.push('No forces applied to the structure.');
    recommendations.push('Add a Point Load or UDL to see structural reactions.');
  }

  // Confidence & Health Calculation
  if (completeness === 100 && stabilityState === 'Stable') {
    solverConfidence = 99.8;
  } else if (stabilityState === 'Stable') {
    solverConfidence = 75;
  } else {
    solverConfidence = 10;
  }

  const healthScore = Math.round((completeness * 0.4) + (solverConfidence * 0.6));
  
  let healthLabel = 'Poor';
  if (healthScore > 90) healthLabel = 'Excellent';
  else if (healthScore > 70) healthLabel = 'Good';
  else if (healthScore > 40) healthLabel = 'Needs Attention';
  else healthLabel = 'Critical';

  return {
    healthScore,
    healthLabel,
    completeness,
    stabilityState,
    solverConfidence,
    warnings,
    recommendations
  };
}

export function EngineeringIntelligencePanel() {
  const model = useStore(state => state.model);
  const aiPrompt = useStore(state => state.aiPrompt);
  const setAiPrompt = useStore(state => state.setAiPrompt);
  const [expanded, setExpanded] = useState(false);
  const [aiExplain, setAiExplain] = useState<string | null>(null);

  const intelligence = useMemo(() => calculateIntelligence(model), [model]);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  // Streaming real AI effect
  const handleAskAI = async (warning: string) => {
    setAiExplain('');
    setDisplayedText('');
    setIsAiLoading(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setDisplayedText("No API key found. Please add VITE_GEMINI_API_KEY to your .env.local file.");
      setIsAiLoading(false);
      setAiExplain("No API key found. Please add VITE_GEMINI_API_KEY to your .env.local file.");
      return;
    }

    try {
      const prompt = `You are Archie, an expert structural engineering AI advisor. 
The user is designing a beam with a span of ${model.span}m.
The beam has the following supports: ${model.supports.map(s => `${s.type} at ${s.position}m`).join(', ') || 'None'}.
The beam has the following loads: ${model.loads.map(l => `${l.type} of magnitude ${l.magnitude}`).join(', ') || 'None'}.
The user received this engineering warning: "${warning}"

Briefly explain why this is structurally unstable or problematic, and concisely suggest how to fix it using structural engineering principles. Keep it under 4 short sentences. Be encouraging and friendly!`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      setAiExplain("streaming"); // Just to show the panel

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        // Gemini stream format is server-sent events, usually JSON arrays. We'll parse the simple parts.
        // It's a bit tricky to parse perfectly manually, but simple regex works for simple text:
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.includes('"text":')) {
            const match = line.match(/"text":\s*"([^"]+)"/);
            if (match && match[1]) {
              const textChunk = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
              setDisplayedText(prev => prev + textChunk);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setDisplayedText("Sorry, I encountered an error connecting to my brain. Check the console for details.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (aiPrompt) {
      setExpanded(true);
      handleAskAI(aiPrompt);
      setAiPrompt(null);
    }
  }, [aiPrompt, setAiPrompt]);

  const isStable = intelligence.stabilityState === 'Stable';
  const colorClass = intelligence.healthScore > 80 ? 'text-emerald-500' : intelligence.healthScore > 50 ? 'text-yellow-500' : 'text-red-500';

  return (
    <motion.div 
      layout
      className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-2xl rounded-3xl overflow-hidden flex flex-col"
    >
      {/* Collapsed / Header View */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">Engineering Intelligence</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-black ${colorClass}`}>{intelligence.healthScore}/100</span>
              <span className="text-xs font-medium text-slate-500">{intelligence.healthLabel}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {intelligence.warnings.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-md">
              <AlertTriangle size={12} /> {intelligence.warnings.length}
            </span>
          )}
          <button className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Dashboard */}
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 dark:border-slate-800"
          >
            <div className="p-5 flex flex-col gap-6 max-h-[400px] overflow-y-auto custom-scrollbar">
              
              {/* Core Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <MetricBox 
                  label="Stability" 
                  value={intelligence.stabilityState} 
                  good={isStable} 
                />
                <MetricBox 
                  label="Completeness" 
                  value={`${intelligence.completeness}%`} 
                  good={intelligence.completeness === 100} 
                />
                <MetricBox 
                  label="Solver Confidence" 
                  value={`${intelligence.solverConfidence}%`} 
                  good={intelligence.solverConfidence > 90} 
                />
                <MetricBox 
                  label="Status" 
                  value={isStable && intelligence.completeness === 100 ? 'Ready' : 'Waiting'} 
                  good={isStable && intelligence.completeness === 100} 
                />
              </div>

              {/* Stability Meter (Live) */}
              <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Structure Stability</span>
                  <span className={isStable ? 'text-emerald-500' : 'text-red-500'}>{isStable ? '100%' : 'Critical'}</span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${isStable ? 'bg-emerald-500' : 'bg-red-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: isStable ? '100%' : '30%' }}
                    transition={{ type: 'spring', damping: 20 }}
                  />
                </div>
              </div>

              {/* Warnings & AI Advisor */}
              {intelligence.warnings.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Activity size={14} className="text-red-500" /> Active Warnings
                  </h4>
                  {intelligence.warnings.map((warn, i) => (
                    <div key={i} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-xl flex flex-col gap-3 group">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {warn}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAskAI(warn)}
                          className="text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Sparkles size={12} /> Explain with AI
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {aiExplain && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-500 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                      <Bot size={64} />
                    </div>
                    <div className="flex items-center gap-2 font-bold mb-2 text-sm text-indigo-100">
                      <Sparkles size={14} /> Archie AI Advisor
                    </div>
                    <p className="text-sm leading-relaxed relative z-10 font-medium whitespace-pre-wrap">
                      {displayedText}
                      {isAiLoading && (
                        <motion.span 
                          animate={{ opacity: [0, 1] }} 
                          transition={{ repeat: Infinity, duration: 0.5 }}
                          className="inline-block w-1.5 h-3 bg-white ml-1"
                        />
                      )}
                    </p>
                    <button 
                      onClick={() => setAiExplain(null)}
                      className="mt-3 text-xs font-bold text-indigo-200 hover:text-white"
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recommendations */}
              {intelligence.recommendations.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    💡 Recommendations
                  </h4>
                  {intelligence.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MetricBox({ label, value, good }: { label: string, value: string, good: boolean }) {
  return (
    <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        {good ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-yellow-500" />}
        <span className={`text-sm font-bold ${good ? 'text-slate-800 dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>{value}</span>
      </div>
    </div>
  );
}
