
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
