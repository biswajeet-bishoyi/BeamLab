import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TitleSlide } from './slides/TitleSlide';
import { OverviewSlide } from './slides/OverviewSlide';
import { BeamConfigSlide } from './slides/BeamConfigSlide';
import { SupportsSlide } from './slides/SupportsSlide';
import { LoadsSlide } from './slides/LoadsSlide';
import { MaterialSlide } from './slides/MaterialSlide';
import { DiagramSlide } from './slides/DiagramSlide';
import { CriticalValuesSlide } from './slides/CriticalValuesSlide';
import { CinemaSlide } from './slides/CinemaSlide';
import { ConclusionSlide } from './slides/ConclusionSlide';
import { PresentationControls } from './PresentationControls';
import { SpeakerNotes } from './SpeakerNotes';
import { LaserPointer, type PointerMode } from './LaserPointer';
import { THEMES, type ThemeId } from './presentationThemes';
import { TimeMachineOverlay } from '../replay/TimeMachineOverlay';

interface Props {
  onClose: () => void;
}

export function PresentationMode({ onClose }: Props) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [themeId, setThemeId] = useState<ThemeId>('dark-studio');
  const [pointerMode, setPointerMode] = useState<PointerMode>('none');
  const [cinemaOpen, setCinemaOpen] = useState(false);

  const theme = THEMES[themeId];

  const slides = [
    { title: 'Title', component: <TitleSlide theme={theme} /> },
    { title: 'Project Overview', component: <OverviewSlide theme={theme} /> },
    { title: 'Beam Configuration', component: <BeamConfigSlide theme={theme} /> },
    { title: 'Support Conditions', component: <SupportsSlide theme={theme} /> },
    { title: 'Applied Loads', component: <LoadsSlide theme={theme} /> },
    { title: 'Material & Section', component: <MaterialSlide theme={theme} /> },
    { title: 'Shear Force Diagram', component: <DiagramSlide theme={theme} type="shear" title="Shear Force Diagram" description="Internal shear force distribution along the beam length." /> },
    { title: 'Bending Moment Diagram', component: <DiagramSlide theme={theme} type="moment" title="Bending Moment Diagram" description="Internal bending moment distribution along the beam length." /> },
    { title: 'Deflection Profile', component: <DiagramSlide theme={theme} type="deflection" title="Deflection Profile" description="Vertical displacement of the beam under the applied loads." /> },
    { title: 'Critical Values', component: <CriticalValuesSlide theme={theme} /> },
    { title: 'Engineering Cinema', component: <CinemaSlide theme={theme} onLaunchCinema={() => setCinemaOpen(true)} /> },
    { title: 'Conclusion', component: <ConclusionSlide theme={theme} /> },
  ];

  const handleNext = () => setSlideIndex(i => Math.min(i + 1, slides.length - 1));
  const handlePrev = () => setSlideIndex(i => Math.max(i - 1, 0));
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      document.exitFullscreen().catch(e => console.error(e));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (cinemaOpen) return; // Don't steal keys from cinema playback
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Enter':
          handleNext();
          break;
        case 'ArrowLeft':
        case 'Backspace':
          handlePrev();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'l':
        case 'L':
          setPointerMode(p => p === 'laser' ? 'none' : 'laser');
          break;
        case 'c':
        case 'C':
          setPointerMode(p => p === 'crosshair' ? 'none' : 'crosshair');
          break;
        case 's':
        case 'S':
          setPointerMode(p => p === 'spotlight' ? 'none' : 'spotlight');
          break;
        // Theme switching hotkeys (1-5)
        case '1': setThemeId('dark-studio'); break;
        case '2': setThemeId('blueprint'); break;
        case '3': setThemeId('corporate'); break;
        case '4': setThemeId('academic'); break;
        case '5': setThemeId('minimal'); break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cinemaOpen, onClose]);

  // Hide default cursor if pointer mode is active
  useEffect(() => {
    if (pointerMode !== 'none') {
      document.body.style.cursor = 'none';
    } else {
      document.body.style.cursor = 'auto';
    }
    return () => { document.body.style.cursor = 'auto'; };
  }, [pointerMode]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[160] font-sans flex flex-col overflow-hidden"
      style={{ background: theme.bg, color: theme.text }}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 pointer-events-none opacity-50" style={{ background: theme.bgGradient }} />

      {/* Main Slide Content area */}
      <div className="relative flex-1 w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {slides[slideIndex].component}
          </motion.div>
        </AnimatePresence>
      </div>

      <LaserPointer mode={pointerMode} />
      
      <PresentationControls 
        theme={theme}
        slideIndex={slideIndex}
        totalSlides={slides.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onExit={onClose}
        onToggleFullscreen={toggleFullscreen}
      />

      <SpeakerNotes 
        slideIndex={slideIndex}
        slideTitle={slides[slideIndex].title}
      />

      {/* Theme Picker (Subtle top right) */}
      <div className="absolute top-6 right-6 flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity z-50">
        <span className="text-xs mr-2 font-mono" style={{ color: theme.textMuted }}>THEME</span>
        {(Object.keys(THEMES) as ThemeId[]).map((tId, i) => (
          <button key={tId} onClick={() => setThemeId(tId)} title={`${THEMES[tId].label} (${i+1})`}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${themeId === tId ? 'scale-110 ring-2 ring-offset-2 ring-offset-black' : ''}`}
            style={{ background: THEMES[tId].bg, borderColor: THEMES[tId].border, '--tw-ring-color': THEMES[tId].accent } as any}
          />
        ))}
      </div>

      {/* Pointer Mode hints */}
      <div className="absolute top-6 left-6 flex items-center gap-3 opacity-20 hover:opacity-100 transition-opacity z-50">
        <span className="text-xs font-mono" style={{ color: theme.textMuted }}>L: Laser</span>
        <span className="text-xs font-mono" style={{ color: theme.textMuted }}>C: Crosshair</span>
        <span className="text-xs font-mono" style={{ color: theme.textMuted }}>S: Spotlight</span>
        <span className="text-xs font-mono" style={{ color: theme.textMuted }}>F: Fullscreen</span>
      </div>

      {/* Cinema / Time Machine Overlay */}
      <AnimatePresence>
        {cinemaOpen && (
          <TimeMachineOverlay onClose={() => setCinemaOpen(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
