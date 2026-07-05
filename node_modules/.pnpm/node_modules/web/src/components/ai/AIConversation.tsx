import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Loader2, Zap, ChevronRight } from 'lucide-react';
import type { AIMessage, AIAction } from './useAIMemory';
import { useStore } from '../../store';
import { toLength, toForce } from '@beamworks/core-engine/units/brands';

function ActionButton({ action, onApply }: { action: AIAction; onApply: (a: AIAction) => void }) {
  const labels: Record<string, string> = {
    SET_SPAN: `Set Span to ${action.value}m`,
    ADD_SUPPORT: `Add ${action.supportType} at x=${action.position}m`,
    ADD_LOAD: `Add ${action.loadType} Load at x=${action.position}m`,
    REMOVE_ALL_LOADS: 'Remove All Loads',
    REMOVE_ALL_SUPPORTS: 'Remove All Supports',
  };
  const label = labels[action.type] ?? action.type;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onApply(action)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow"
    >
      <Zap size={11} />
      {label}
    </motion.button>
  );
}

function MessageCard({ msg }: { msg: AIMessage }) {
  const dispatchCommand = useStore(s => s.dispatchCommand);
  const model = useStore(s => s.model);

  const applyAction = (action: AIAction) => {
    const ts = Date.now();
    if (action.type === 'SET_SPAN' && action.value != null) {
      dispatchCommand({ type: 'UPDATE_SPAN', timestamp: ts, payload: { newSpan: toLength(action.value) } });
    }
    if (action.type === 'ADD_SUPPORT' && action.supportType && action.position != null) {
      dispatchCommand({
        type: 'ADD_SUPPORT',
        timestamp: ts,
        payload: {
          support: {
            id: `ai-s-${ts}`,
            type: action.supportType as 'pin' | 'roller' | 'fixed',
            position: toLength(action.position),
          }
        }
      });
    }
    if (action.type === 'ADD_LOAD' && action.position != null && action.magnitude != null) {
      dispatchCommand({
        type: 'ADD_LOAD',
        timestamp: ts,
        payload: {
          load: {
            id: `ai-l-${ts}`,
            type: (action.loadType ?? 'point') as 'point',
            position: toLength(action.position),
            magnitude: toForce(action.magnitude),
          }
        }
      });
    }
    if (action.type === 'REMOVE_ALL_SUPPORTS') {
      model.supports.forEach(s => dispatchCommand({ type: 'REMOVE_OBJECT', timestamp: Date.now(), payload: { id: s.id } }));
    }
    if (action.type === 'REMOVE_ALL_LOADS') {
      model.loads.forEach(l => dispatchCommand({ type: 'REMOVE_OBJECT', timestamp: Date.now(), payload: { id: l.id } }));
    }
  };

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] flex items-start gap-2">
          <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-lg">
            {msg.content}
          </div>
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 mt-1">
            <User size={13} className="text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-indigo-500/30">
        <Bot size={15} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-200 leading-relaxed shadow">
          {msg.isStreaming && !msg.content ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              <span>Archie is thinking…</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          )}
        </div>

        {/* Action Buttons */}
        {msg.actions && msg.actions.length > 0 && !msg.isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-2 flex flex-wrap gap-2"
          >
            <span className="text-xs text-slate-500 flex items-center gap-1 w-full mb-1">
              <ChevronRight size={11} /> Apply to model
            </span>
            {msg.actions.map((a, i) => (
              <ActionButton key={i} action={a} onApply={applyAction} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

interface Props {
  messages: AIMessage[];
}

export function AIConversation({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-4 space-y-4">
      <AnimatePresence initial={false}>
        {messages.map(msg => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MessageCard msg={msg} />
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
