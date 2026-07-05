import { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat } from 'lucide-react';
import { SCENES } from './PlaybackEngine';

interface Props {
  isPlaying: boolean;
  togglePlay: () => void;
  isLooping: boolean;
  setIsLooping: (l: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
  globalTimeMs: number;
  totalDurationMs: number;
  seek: (progress: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToScene: (sceneId: import('./PlaybackEngine').PlaybackScene) => void;
}

export function TimeMachineTrack({
  isPlaying, togglePlay, isLooping, setIsLooping, speed, setSpeed,
  globalTimeMs, totalDurationMs, seek, stepForward, stepBackward, jumpToScene
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const progress = totalDurationMs === 0 ? 0 : globalTimeMs / totalDurationMs;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (!trackRef.current || (!isDragging && e.type !== 'pointerdown')) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    seek(x / rect.width);
  };

  const handlePointerUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col bg-slate-900 border-t border-slate-700 w-full shadow-2xl">
      {/* Controls Bar */}
      <div className="flex items-center px-6 py-3 border-b border-slate-800 gap-6">
        <div className="flex items-center gap-2">
          <button onClick={stepBackward} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" title="Previous Stage">
            <SkipBack size={18} />
          </button>
          <button onClick={togglePlay} className="p-3 text-white bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/30 transition-all">
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button onClick={stepForward} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" title="Next Stage">
            <SkipForward size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-700" />
        
        <div className="font-mono text-sm text-slate-400 w-20 text-center">
          {(globalTimeMs / 1000).toFixed(1)}s / {(totalDurationMs / 1000).toFixed(1)}s
        </div>
        
        <div className="w-px h-6 bg-slate-700" />

        <div className="flex items-center gap-1">
          <button onClick={() => setIsLooping(!isLooping)} className={`p-2 rounded transition-colors ${isLooping ? 'text-indigo-400 bg-indigo-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Loop Playback">
            <Repeat size={16} />
          </button>
          {[0.5, 1, 2, 4].map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`px-2 py-1 text-xs font-mono rounded transition-colors ${speed === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Scrub Track */}
      <div className="px-6 py-4 relative group h-24 flex items-center">
        {/* Background track */}
        <div 
          ref={trackRef}
          onPointerDown={handlePointerDown}
          className="w-full h-12 bg-slate-800/50 rounded-lg relative cursor-pointer border border-slate-700/50 overflow-hidden"
        >
          {/* Fill */}
          <div className="absolute top-0 left-0 bottom-0 bg-indigo-600/30 border-r border-indigo-400 pointer-events-none" style={{ width: `${progress * 100}%` }} />
          
          {/* Milestones / Scene boundaries */}
          {(() => {
            let acc = 0;
            return SCENES.map((scene) => {
              const startPct = (acc / totalDurationMs) * 100;
              const widthPct = (scene.durationMs / totalDurationMs) * 100;
              acc += scene.durationMs;
              return (
                <div key={scene.id} 
                  className="absolute top-0 bottom-0 border-l border-slate-700/50 hover:bg-white/5 transition-colors group/milestone"
                  style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                  onClick={(e) => { e.stopPropagation(); jumpToScene(scene.id); }}
                >
                  <div className="absolute top-1 left-2 text-[10px] font-mono text-slate-500 opacity-50 group-hover/milestone:opacity-100 uppercase truncate pr-2">
                    {scene.title}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Playhead Handle */}
        <div 
          className="absolute top-2 bottom-2 w-px bg-red-500 pointer-events-none z-10"
          style={{ left: `calc(1.5rem + ${progress * (trackRef.current?.clientWidth || 0)}px)` }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-3 bg-red-500 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
