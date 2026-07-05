import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useStore } from '../../store';
import { buildModelContext } from '../ai/AIModelContext';

const AUDIENCES = [
  'Client (Non-technical)',
  'Engineering Students',
  'Professor / Academic',
  'Technical Review Board',
  'Management Meeting'
];

interface Props {
  slideTitle: string;
  slideIndex: number;
}

export function SpeakerNotes({ slideTitle, slideIndex }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const model = useStore(s => s.model);
  const analysisResult = useStore(s => s.analysisResult);

  useEffect(() => {
    const key = `${slideIndex}-${audience}`;
    if (isOpen && !notes[key] && !isGenerating) {
      generateNotes(key);
    }
  }, [slideIndex, audience, isOpen]);

  const generateNotes = async (key: string) => {
    setIsGenerating(true);
    setNotes(prev => ({ ...prev, [key]: '' }));

    const modelContext = buildModelContext(model, analysisResult, 'professional');
    const prompt = `You are an AI presentation assistant for a structural engineer. 
The engineer is currently presenting Slide ${slideIndex + 1}: "${slideTitle}".
The audience is: ${audience}.
Model Context:
${modelContext}

Provide 3 concise, highly relevant bullet points of speaker notes for this specific slide.
Write them as direct talking points for the presenter. Do not include introductory text.
Adapt the vocabulary and depth to the audience type.`;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setNotes(prev => ({ ...prev, [key]: 'No API key found. Add VITE_GEMINI_API_KEY.' }));
      setIsGenerating(false);
      return;
    }

    abortRef.current = new AbortController();

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
      }

      if (!response.body) throw new Error('No body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.includes('"text":')) {
            const match = line.match(/"text":\s*"((?:[^"\\]|\\.)*)"/);
            if (match?.[1]) {
              const textChunk = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
              fullText += textChunk;
              setNotes(prev => ({ ...prev, [key]: fullText }));
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setNotes(prev => ({ ...prev, [key]: `API Error: ${e.message}` }));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const currentNotes = notes[`${slideIndex}-${audience}`];

  return (
    <div className="absolute bottom-6 left-6 z-50 flex flex-col items-start font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-96 mb-4 overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <Bot size={16} /> AI Speaker Notes
              </div>
              <select 
                value={audience}
                onChange={e => setAudience(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 outline-none"
              >
                {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            
            <div className="p-4 text-sm text-slate-300 leading-relaxed min-h-[100px] max-h-[300px] overflow-y-auto custom-scrollbar">
              {isGenerating && !currentNotes ? (
                <div className="flex items-center justify-center h-20 text-slate-500 gap-2">
                  <Loader2 size={16} className="animate-spin" /> Drafting notes for {audience}...
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{currentNotes || 'No notes generated.'}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-full text-slate-300 text-sm font-semibold shadow-lg transition-colors opacity-20 hover:opacity-100"
      >
        <Bot size={16} className={isOpen ? 'text-indigo-400' : ''} /> 
        Notes
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
    </div>
  );
}
