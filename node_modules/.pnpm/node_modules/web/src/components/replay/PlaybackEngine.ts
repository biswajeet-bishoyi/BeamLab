import { useState, useEffect, useRef, useCallback } from 'react';

export const PlaybackScene = {
  Canvas: 0,
  Supports: 1,
  Loads: 2,
  Reactions: 3,
  SFD: 4,
  BMD: 5,
  Deflection: 6,
  Stress: 7,
  CriticalLocations: 8,
  Summary: 9
} as const;

export type PlaybackScene = typeof PlaybackScene[keyof typeof PlaybackScene];

export interface SceneConfig {
  id: PlaybackScene;
  title: string;
  durationMs: number;
}

export const SCENES: SceneConfig[] = [
  { id: PlaybackScene.Canvas, title: "Initial State", durationMs: 2000 },
  { id: PlaybackScene.Supports, title: "Boundary Conditions", durationMs: 2000 },
  { id: PlaybackScene.Loads, title: "Load Application", durationMs: 2000 },
  { id: PlaybackScene.Reactions, title: "Reaction Formation", durationMs: 3000 },
  { id: PlaybackScene.SFD, title: "Shear Development", durationMs: 4000 },
  { id: PlaybackScene.BMD, title: "Moment Formation", durationMs: 4000 },
  { id: PlaybackScene.Deflection, title: "Deformation", durationMs: 3000 },
  { id: PlaybackScene.Stress, title: "Stress Distribution", durationMs: 2000 },
  { id: PlaybackScene.CriticalLocations, title: "Critical State", durationMs: 3000 },
  { id: PlaybackScene.Summary, title: "Design Complete", durationMs: 2000 }
];

export function usePlaybackEngine() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [globalTimeMs, setGlobalTimeMs] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  
  const totalDurationMs = SCENES.reduce((acc, s) => acc + s.durationMs, 0);

  const lastUpdateRef = useRef(performance.now());
  const requestRef = useRef<number | undefined>(undefined);

  const update = useCallback((time: number) => {
    if (isPlaying) {
      const delta = (time - lastUpdateRef.current) * speed;
      setGlobalTimeMs(prev => {
        const next = prev + delta;
        if (next >= totalDurationMs) {
          if (isLooping) return 0; // loop back to start
          setIsPlaying(false);
          return totalDurationMs;
        }
        return next;
      });
    }
    lastUpdateRef.current = time;
    requestRef.current = requestAnimationFrame(update);
  }, [isPlaying, speed, totalDurationMs, isLooping]);

  useEffect(() => {
    lastUpdateRef.current = performance.now();
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current !== undefined) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  // Derive current scene and local progress (0 to 1) based on globalTimeMs
  let accumulated = 0;
  let currentScene = SCENES[0];
  let localProgress = 0;
  let sceneStartTime = 0;

  for (const scene of SCENES) {
    if (globalTimeMs >= accumulated && globalTimeMs <= accumulated + scene.durationMs) {
      currentScene = scene;
      sceneStartTime = accumulated;
      localProgress = (globalTimeMs - accumulated) / scene.durationMs;
      break;
    }
    accumulated += scene.durationMs;
  }
  
  // End bounds
  if (globalTimeMs >= totalDurationMs) {
    currentScene = SCENES[SCENES.length - 1];
    localProgress = 1;
    sceneStartTime = totalDurationMs - SCENES[SCENES.length - 1].durationMs;
  }

  const togglePlay = () => setIsPlaying(!isPlaying);
  const restart = () => { setGlobalTimeMs(0); setIsPlaying(true); };
  const seek = (progressNormalized: number) => {
    setGlobalTimeMs(Math.max(0, Math.min(1, progressNormalized)) * totalDurationMs);
  };
  const setTime = (timeMs: number) => setGlobalTimeMs(timeMs);
  const jumpToScene = (sceneId: PlaybackScene) => {
    let t = 0;
    for (const s of SCENES) {
      if (s.id === sceneId) break;
      t += s.durationMs;
    }
    setGlobalTimeMs(t);
  };
  const stepForward = () => {
    const currentIndex = SCENES.findIndex(s => s.id === currentScene.id);
    if (currentIndex < SCENES.length - 1) jumpToScene(SCENES[currentIndex + 1].id);
  };
  const stepBackward = () => {
    const currentIndex = SCENES.findIndex(s => s.id === currentScene.id);
    if (currentIndex > 0) jumpToScene(SCENES[currentIndex - 1].id);
  };

  return {
    isPlaying,
    setIsPlaying,
    togglePlay,
    speed,
    setSpeed,
    isLooping,
    setIsLooping,
    restart,
    seek,
    setTime,
    jumpToScene,
    stepForward,
    stepBackward,
    globalTimeMs,
    totalDurationMs,
    globalProgress: globalTimeMs / totalDurationMs,
    currentScene,
    sceneStartTime,
    localProgress
  };
}
