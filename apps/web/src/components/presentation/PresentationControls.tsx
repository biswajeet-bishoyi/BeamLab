import { ChevronLeft, ChevronRight, Maximize, X } from 'lucide-react';
import type { PresentationTheme } from './presentationThemes';

interface Props {
  theme: PresentationTheme;
  slideIndex: number;
  totalSlides: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
  onToggleFullscreen: () => void;
}

export function PresentationControls({ theme, slideIndex, totalSlides, onNext, onPrev, onExit, onToggleFullscreen }: Props) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full backdrop-blur-xl border shadow-2xl transition-all opacity-20 hover:opacity-100 focus-within:opacity-100 z-50"
      style={{ background: theme.surface, borderColor: theme.border }}
    >
      <button onClick={onPrev} disabled={slideIndex === 0}
        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
        style={{ color: theme.text }}>
        <ChevronLeft size={24} />
      </button>

      <span className="font-mono text-sm tracking-widest px-2" style={{ color: theme.textMuted }}>
        {slideIndex + 1} / {totalSlides}
      </span>

      <button onClick={onNext} disabled={slideIndex === totalSlides - 1}
        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
        style={{ color: theme.text }}>
        <ChevronRight size={24} />
      </button>

      <div className="w-px h-6 mx-2" style={{ background: theme.divider }} />

      <button onClick={onToggleFullscreen} title="Toggle Fullscreen (F)"
        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        style={{ color: theme.textMuted }}>
        <Maximize size={18} />
      </button>

      <button onClick={onExit} title="Exit Presentation (Esc)"
        className="p-2 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors"
        style={{ color: theme.textMuted }}>
        <X size={20} />
      </button>
    </div>
  );
}
