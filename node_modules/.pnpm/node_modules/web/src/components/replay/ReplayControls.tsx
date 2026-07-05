import { Play, Pause, SkipBack, ListVideo } from 'lucide-react';
import { SCENES } from './PlaybackEngine';

interface ReplayControlsProps {
  isPlaying: boolean;
  togglePlay: () => void;
  speed: number;
  setSpeed: (speed: number) => void;
  restart: () => void;
  seek: (progress: number) => void;
  globalProgress: number;
  totalDurationMs: number;
}

export function ReplayControls({ 
  isPlaying, togglePlay, speed, setSpeed, restart, seek, globalProgress, totalDurationMs 
}: ReplayControlsProps) {
  
  return (
    <div className="flex flex-col gap-2 w-full max-w-4xl mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-4 rounded-3xl shadow-2xl">
      
      {/* Timeline Scrubbing Bar */}
      <div className="relative h-6 flex items-center group cursor-pointer" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const p = (e.clientX - rect.left) / rect.width;
        seek(Math.max(0, Math.min(1, p)));
      }}>
        {/* Track */}
        <div className="absolute left-0 right-0 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-400 transition-none"
            style={{ width: `${globalProgress * 100}%` }}
          />
        </div>
        
        {/* Chapter Markers */}
        <div className="absolute left-0 right-0 h-full pointer-events-none">
          {(() => {
            let acc = 0;
            return SCENES.map((scene) => {
              const pos = (acc / totalDurationMs) * 100;
              acc += scene.durationMs;
              return (
                <div 
                  key={scene.id} 
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-slate-900/50"
                  style={{ left: `${pos}%` }}
                  title={scene.title}
                />
              );
            });
          })()}
        </div>
        
        {/* Scrubber Knob */}
        <div 
          className="absolute h-4 w-4 bg-white rounded-full shadow-lg border-2 border-yellow-400 top-1/2 -translate-y-1/2 -ml-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${globalProgress * 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-4">
          <button onClick={restart} className="text-slate-400 hover:text-white transition-colors">
            <SkipBack size={20} />
          </button>
          
          <button 
            onClick={togglePlay} 
            className="w-12 h-12 flex items-center justify-center bg-yellow-400 text-slate-900 hover:bg-yellow-300 rounded-full transition-transform hover:scale-105 active:scale-95 shadow-lg"
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
          </button>

          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            {[0.5, 1, 2, 4].map(s => (
              <button 
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${speed === s ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <ListVideo size={18} />
          <span className="text-sm font-semibold tracking-widest uppercase">Story Mode</span>
        </div>
      </div>
    </div>
  );
}
