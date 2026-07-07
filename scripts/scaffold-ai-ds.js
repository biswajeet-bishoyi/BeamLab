const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DS_DIR = path.join(ROOT_DIR, 'packages', 'design-system');
const AI_DIR = path.join(DS_DIR, 'src', 'ai');

if (!fs.existsSync(AI_DIR)) fs.mkdirSync(AI_DIR, { recursive: true });

// 1. ChatBubble.tsx
fs.writeFileSync(path.join(AI_DIR, 'ChatBubble.tsx'), `
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css'; // or your preferred theme
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ChatBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, className, isStreaming }) => {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isSystem) {
    return (
      <div className={twMerge("flex justify-center my-4", className)}>
        <span className="text-xs text-muted uppercase tracking-wider font-medium px-3 py-1 bg-panel rounded-full border border-subtle">
          {content}
        </span>
      </div>
    );
  }

  return (
    <div className={twMerge("flex w-full mb-6", isUser ? "justify-end" : "justify-start", className)}>
      <div className={twMerge(
        "max-w-[85%] rounded-lg px-4 py-3 shadow-sm",
        isUser 
          ? "bg-accent text-accent-foreground rounded-tr-sm" 
          : "bg-panel text-primary border border-subtle rounded-tl-sm"
      )}>
        <div className={twMerge(
          "prose prose-sm max-w-none break-words",
          isUser ? "prose-invert" : "prose-invert prose-p:leading-relaxed prose-pre:bg-[#0d0d0d] prose-pre:border prose-pre:border-subtle"
        )}>
          {content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
            >
              {content}
            </ReactMarkdown>
          ) : (
            isStreaming && <span className="inline-block w-2 h-4 bg-accent animate-pulse" />
          )}
          {isStreaming && content && (
            <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
};
`);

// 2. PromptComposer.tsx
fs.writeFileSync(path.join(AI_DIR, 'PromptComposer.tsx'), `
import React, { useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Send, Square } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  placeholder?: string;
  className?: string;
}

export const PromptComposer: React.FC<PromptComposerProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  placeholder = "Message Archie... (Type '/' for commands)",
  className
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (value.trim() && !isSubmitting) {
        onSubmit();
      }
    }
    if (e.key === 'Escape' && isSubmitting && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={twMerge("relative flex flex-col w-full bg-app border border-subtle rounded-xl shadow-sm overflow-hidden focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all", className)}>
      <TextareaAutosize
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        minRows={1}
        maxRows={10}
        className="w-full resize-none bg-transparent px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none"
      />
      <div className="flex items-center justify-between px-3 py-2 bg-panel/50 border-t border-subtle/50">
        <div className="flex items-center gap-2">
          {/* Action chips could go here */}
          <span className="text-[10px] text-muted font-medium px-2 py-0.5 rounded bg-subtle">Ctrl+Enter to send</span>
        </div>
        <div>
          {isSubmitting ? (
            <button
              onClick={onCancel}
              className="p-1.5 text-muted hover:text-red-400 hover:bg-subtle rounded-md transition-colors"
              title="Stop Generation (Esc)"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => value.trim() && onSubmit()}
              disabled={!value.trim()}
              className="p-1.5 text-accent hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent rounded-md transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
`);

// 3. Update index.ts to export new AI components
const indexContent = fs.readFileSync(path.join(DS_DIR, 'src', 'index.ts'), 'utf8');
const newExports = "export * from './ai/ChatBubble';\\nexport * from './ai/PromptComposer';\\n";
if (!indexContent.includes('PromptComposer')) {
  fs.writeFileSync(path.join(DS_DIR, 'src', 'index.ts'), indexContent + '\\n' + newExports);
}

console.log('AI Design System components scaffolded.');
