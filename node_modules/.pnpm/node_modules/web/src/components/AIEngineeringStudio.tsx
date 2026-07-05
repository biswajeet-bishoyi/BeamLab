import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Send, Home, RotateCcw, ChevronDown, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { UserLevelModal } from './ai/UserLevelModal';
import { AIHomeCards } from './ai/AIHomeCards';
import { AIConversation } from './ai/AIConversation';
import { AIInsightsPanel } from './ai/AIInsightsPanel';
import { AIQuickActions } from './ai/AIQuickActions';
import { useAIMemory } from './ai/useAIMemory';
import { buildModelContext } from './ai/AIModelContext';
import type { AIUserLevel } from '../store';

const LEVEL_LABELS: Record<AIUserLevel, string> = {
  beginner: 'Beginner',
  student: 'Student',
  intermediate: 'Intermediate',
  professional: 'Professional',
  researcher: 'Researcher',
};

export function AIEngineeringStudio({ onClose }: { onClose: () => void }) {
  const model = useStore(s => s.model);
  const analysisResult = useStore(s => s.analysisResult);
  const aiUserLevel = useStore(s => s.aiUserLevel);
  const setAiUserLevel = useStore(s => s.setAiUserLevel);

  const { messages, isStreaming, sendMessage, clearMemory } = useAIMemory(aiUserLevel);
  const [inputText, setInputText] = useState('');
  const [showHome, setShowHome] = useState(true);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Show onboarding modal if no level set
  const needsOnboarding = aiUserLevel === null;

  const handleSend = (text: string) => {
    const msg = text.trim();
    if (!msg || isStreaming) return;

    const systemPrompt = buildModelContext(model, analysisResult, aiUserLevel);
    setShowHome(false);
    setInputText('');
    sendMessage(msg, systemPrompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputText);
    }
  };

  const handleNewChat = () => {
    clearMemory();
    setShowHome(true);
  };

  useEffect(() => {
    if (!needsOnboarding && !showHome) {
      inputRef.current?.focus();
    }
  }, [needsOnboarding, showHome]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-slate-950 flex flex-col font-sans"
    >
      {/* Onboarding Modal */}
      <AnimatePresence>
        {needsOnboarding && (
          <UserLevelModal onSelect={(level) => setAiUserLevel(level)} />
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Archie
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">AI Engineering Studio</span>
            </h2>
            <p className="text-xs text-slate-400">Your intelligent structural engineering companion</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Level picker */}
          <div className="relative">
            <button
              onClick={() => setLevelPickerOpen(!levelPickerOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs text-slate-300 transition-colors"
            >
              <Sparkles size={12} />
              {aiUserLevel ? LEVEL_LABELS[aiUserLevel] : 'Set Level'}
              <ChevronDown size={11} />
            </button>
            <AnimatePresence>
              {levelPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-9 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden w-44"
                >
                  {(Object.keys(LEVEL_LABELS) as AIUserLevel[]).map(level => (
                    <button
                      key={level}
                      onClick={() => { setAiUserLevel(level); setLevelPickerOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-900/40 transition-colors ${aiUserLevel === level ? 'text-indigo-300 font-bold' : 'text-slate-300'}`}
                    >
                      {LEVEL_LABELS[level]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Home / New Chat */}
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors"
            title="New chat / Home"
          >
            {messages.length > 0 ? <RotateCcw size={16} /> : <Home size={16} />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-red-600 hover:border-red-600 text-slate-300 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT RAIL — Quick Actions */}
        <div className="w-48 xl:w-56 shrink-0 border-r border-slate-800 p-3 overflow-y-auto custom-scrollbar bg-slate-900/50">
          <AIQuickActions onSend={handleSend} />
        </div>

        {/* CENTER — Home Cards or Conversation */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {showHome && messages.length === 0 ? (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-hidden p-4"
              >
                <AIHomeCards onSelect={handleSend} />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-hidden flex flex-col"
              >
                <AIConversation messages={messages} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Bar */}
          <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl">
            <div className="flex items-end gap-3 bg-slate-800 border border-slate-700 focus-within:border-indigo-500 rounded-2xl px-4 py-3 transition-colors shadow-lg">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Ask anything… "Create a 10m continuous beam" or "Explain the shear diagram"'
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none resize-none leading-relaxed"
                style={{ maxHeight: '120px' }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSend(inputText)}
                disabled={!inputText.trim() || isStreaming}
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-lg shrink-0"
              >
                <Send size={15} className="text-white" />
              </motion.button>
            </div>
            <p className="text-xs text-slate-600 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>

        {/* RIGHT RAIL — Live Insights */}
        <div className="w-56 xl:w-64 shrink-0 border-l border-slate-800 p-3 overflow-y-auto custom-scrollbar bg-slate-900/50">
          <AIInsightsPanel />
        </div>

      </div>
    </motion.div>
  );
}
