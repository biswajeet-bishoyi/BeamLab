import { useState, useCallback, useRef } from 'react';
import type { AIUserLevel } from '../../store';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  timestamp: Date;
  actions?: AIAction[];
}

export interface AIAction {
  type: string;
  value?: number;
  supportType?: string;
  position?: number;
  magnitude?: number;
  loadType?: string;
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent`;

function parseActions(text: string): { cleanText: string; actions: AIAction[] } {
  const marker = 'ACTION_BLOCK:';
  const idx = text.indexOf(marker);
  if (idx === -1) return { cleanText: text, actions: [] };

  const cleanText = text.slice(0, idx).trim();
  try {
    const jsonStr = text.slice(idx + marker.length).trim();
    const parsed = JSON.parse(jsonStr);
    return { cleanText, actions: parsed.actions ?? [] };
  } catch {
    return { cleanText, actions: [] };
  }
}

export function useAIMemory(userLevel: AIUserLevel | null) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userText: string, systemPrompt: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: AIMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    if (!apiKey) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'No API key found. Please add VITE_GEMINI_API_KEY to your .env.local file.', isStreaming: false }
          : m
      ));
      setIsStreaming(false);
      return;
    }

    // Build conversation history for multi-turn context
    const historyContents = messages.flatMap(m => {
      if (m.role === 'user') return [{ role: 'user', parts: [{ text: m.content }] }];
      if (m.role === 'assistant' && m.content) return [{ role: 'model', parts: [{ text: m.content }] }];
      return [];
    });

    const fullContents = [
      // System context as first user message
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am Archie, your AI engineering companion. I have full context of your current model and am ready to help.' }] },
      ...historyContents,
      { role: 'user', parts: [{ text: userText }] },
    ];

    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: fullContents }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');
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
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: fullText } : m
              ));
            }
          }
        }
      }

      // Parse any action block out of final text
      const { cleanText, actions } = parseActions(fullText);
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: cleanText, isStreaming: false, actions } : m
      ));

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errMsg = err.message?.includes('HTTP Error') || err.message?.includes('Quota') 
        ? `API Error: ${err.message}` 
        : 'Sorry, I encountered an error. Please try again.';
        
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: errMsg, isStreaming: false }
          : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [messages, userLevel]);

  const clearMemory = useCallback(() => {
    setMessages([]);
    abortRef.current?.abort();
  }, []);

  return { messages, isStreaming, sendMessage, clearMemory };
}
