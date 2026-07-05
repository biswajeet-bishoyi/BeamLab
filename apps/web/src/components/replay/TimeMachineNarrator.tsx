import { useEffect, useState, useRef } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { useStore } from '../../store';
import { buildModelContext } from '../ai/AIModelContext';
import { type SceneConfig } from './PlaybackEngine';

interface Props {
  currentScene: SceneConfig;
}

export function TimeMachineNarrator({ currentScene }: Props) {
  const [script, setScript] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Record<number, string>>({});

  const model = useStore(s => s.model);
  const analysisResult = useStore(s => s.analysisResult);

  useEffect(() => {
    // If we already generated a script for this scene, just show it immediately.
    if (cacheRef.current[currentScene.id]) {
      setScript(cacheRef.current[currentScene.id]);
      return;
    }

    // Debounce slightly so fast scrubbing doesn't trigger 100 API calls
    const timer = setTimeout(() => {
      generateScript(currentScene);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentScene.id]);

  const generateScript = async (scene: SceneConfig) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsGenerating(true);
    setScript('');

    const context = buildModelContext(model, analysisResult, 'professional');
    const prompt = `You are Archie, an AI structural engineering narrator for an interactive "Engineering Time Machine".
We are currently in the stage: "${scene.title}".
Context of the structure:
${context}

Explain in 2-3 concise, highly educational sentences what is happening physically to the beam at this exact stage of the timeline. 
Do not use bullet points or introductory filler (like "In this stage"). Just write the narrative directly.`;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = `(API Key missing). ${scene.title} stage.`;
      setScript(fallback);
      cacheRef.current[scene.id] = fallback;
      setIsGenerating(false);
      return;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
        signal: abortRef.current.signal,
      });

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
              setScript(fullText);
            }
          }
        }
      }
      cacheRef.current[scene.id] = fullText;
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        const errorMsg = 'Narrator connection lost.';
        setScript(errorMsg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="bg-slate-800/80 px-4 py-3 flex items-center justify-between border-b border-slate-700 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm tracking-wide">
          <Bot size={16} /> AI NARRATOR
        </div>
        <div className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 text-xs font-mono">
          STAGE: {currentScene.id}
        </div>
      </div>

      {/* Script Content */}
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar relative">
        <h3 className="text-white text-xl font-black mb-4">{currentScene.title}</h3>
        
        <div className="text-slate-300 leading-relaxed text-sm">
          {script}
          {isGenerating && (
            <span className="inline-flex items-center ml-2 text-indigo-400">
              <Loader2 size={14} className="animate-spin mr-1" />
              <span className="text-xs">Thinking...</span>
            </span>
          )}
        </div>
      </div>
      
      {/* Subtle decorative glow */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-indigo-900/10 to-transparent pointer-events-none" />
    </div>
  );
}
