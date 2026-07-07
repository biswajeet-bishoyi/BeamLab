
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
