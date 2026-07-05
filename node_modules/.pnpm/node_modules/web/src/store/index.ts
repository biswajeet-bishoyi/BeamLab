import { create } from 'zustand';
import type { StructuralModel } from '@beamworks/core-engine/model/types';
import type { StructuralCommand } from '@beamworks/core-engine/commands/types';
import type { AnalysisResult, ModelingError } from '@beamworks/core-engine/solver/reactions';
import { toLength, toForce } from '@beamworks/core-engine/units/brands';
import { engineInstance } from '../engine/AnalysisEngine';

export type AIUserLevel = 'beginner' | 'student' | 'intermediate' | 'professional' | 'researcher';
export type EnvironmentId = 'none' | 'blueprint' | 'residential' | 'bridge' | 'industrial' | 'commercial' | 'construction' | 'research';

interface BeamworksState {
  model: StructuralModel;
  
  // Real Analysis
  analysisResult: AnalysisResult | null;
  analysisError: ModelingError | null;
  
  // Ghost Analysis (Predictive)
  ghostModel: StructuralModel | null;
  ghostAnalysisResult: AnalysisResult | null;
  
  selectedObjectId: string | null;
  currentView: 'dashboard' | 'gallery' | 'workspace';
  hoveredX: number | null;
  mouseX: number | null;
  mouseY: number | null;
  aiPrompt: string | null;
  aiStudioOpen: boolean;
  aiUserLevel: AIUserLevel | null;
  activeEnvironment: EnvironmentId;
  performanceMonitorOpen: boolean;
  
  dispatchCommand: (cmd: StructuralCommand) => void;
  previewCommand: (cmd: StructuralCommand) => void;
  clearPreview: () => void;
  
  selectObject: (id: string | null) => void;
  setHoveredX: (x: number | null, mx?: number | null, my?: number | null) => void;
  setAiPrompt: (prompt: string | null) => void;
  setView: (view: 'dashboard' | 'gallery' | 'workspace') => void;
  loadPreset: (model: StructuralModel) => void;
  setAiStudioOpen: (open: boolean) => void;
  setAiUserLevel: (level: AIUserLevel) => void;
  setEnvironment: (id: EnvironmentId) => void;
  setPerformanceMonitorOpen: (open: boolean) => void;
}

export const initialModel: StructuralModel = {
  span: toLength(10),
  supports: [
    { id: 's1', type: 'pin', position: toLength(0) },
    { id: 's2', type: 'roller', position: toLength(10) }
  ],
  loads: [
    { id: 'l1', type: 'point', position: toLength(5), magnitude: toForce(-100) }
  ],
  material: { id: 'm1', name: 'Structural Steel', E: 200e9, density: 7850 },
  section: { id: 'sec1', name: 'W12x26', area: 0.0049, momentOfInertia: 8.5e-5, height: 0.31 }
};

export const useStore = create<BeamworksState>((set, get) => {
  
  // Listen for worker results
  engineInstance.on('analysis:complete', (data) => {
    const { type, result, error } = data;
    if (type === 'COMMIT') {
      set({ analysisResult: result, analysisError: error });
    } else if (type === 'PREVIEW') {
      set({ ghostAnalysisResult: result });
    }
  });

  // Initial calculation
  engineInstance.calculate(initialModel, false);

  const applyCommand = (cmd: StructuralCommand, baseModel: StructuralModel) => {
    let nextModel = { ...baseModel };
    
    switch (cmd.type) {
      case 'ADD_SUPPORT':
        nextModel.supports = [...nextModel.supports, cmd.payload.support];
        break;
      case 'MOVE_SUPPORT':
        nextModel.supports = nextModel.supports.map(s => 
          s.id === cmd.payload.id ? { ...s, position: cmd.payload.newPosition } : s
        );
        break;
      case 'ADD_LOAD':
        nextModel.loads = [...nextModel.loads, cmd.payload.load];
        break;
      case 'MOVE_LOAD':
        nextModel.loads = nextModel.loads.map(l => 
          l.id === cmd.payload.id ? { ...l, position: cmd.payload.newPosition } : l
        );
        break;
      case 'UPDATE_SPAN':
        nextModel.span = cmd.payload.newSpan;
        break;
      case 'UPDATE_LOAD_MAGNITUDE':
        nextModel.loads = nextModel.loads.map(l =>
          l.id === cmd.payload.id 
            ? { ...l, magnitude: cmd.payload.newMagnitude } 
            : l
        ) as typeof nextModel.loads;
        break;
      case 'UPDATE_UDL_RANGE':
        nextModel.loads = nextModel.loads.map(l =>
          l.id === cmd.payload.id && l.type === 'distributed'
            ? { ...l, startPosition: cmd.payload.startPosition, endPosition: cmd.payload.endPosition }
            : l
        );
        break;
      case 'REMOVE_OBJECT':
        nextModel.loads = nextModel.loads.filter(l => l.id !== cmd.payload.id);
        nextModel.supports = nextModel.supports.filter(s => s.id !== cmd.payload.id);
        break;
      case 'UPDATE_MATERIAL':
        nextModel.material = cmd.payload.material;
        break;
      case 'UPDATE_SECTION':
        nextModel.section = cmd.payload.section;
        break;
    }
    return nextModel;
  };

  return {
    model: initialModel,
    analysisResult: null,
    analysisError: null,
    
    ghostModel: null,
    ghostAnalysisResult: null,
    
    selectedObjectId: null,
    currentView: 'dashboard',
    hoveredX: null,
    mouseX: null,
    mouseY: null,
    aiPrompt: null,
    aiStudioOpen: false,
    aiUserLevel: null,
    activeEnvironment: 'none',
    performanceMonitorOpen: false,
    
    dispatchCommand: (cmd: StructuralCommand) => {
      const state = get();
      const nextModel = applyCommand(cmd, state.model);
      engineInstance.calculate(nextModel, false);
      set({ 
        model: nextModel, 
        ghostModel: null, 
        ghostAnalysisResult: null 
      });
    },
    
    previewCommand: (cmd: StructuralCommand) => {
      const state = get();
      const nextModel = applyCommand(cmd, state.model);
      engineInstance.calculate(nextModel, true);
      set({ ghostModel: nextModel });
    },
    
    clearPreview: () => set({ ghostModel: null, ghostAnalysisResult: null }),
    
    selectObject: (id) => set({ selectedObjectId: id }),
    setHoveredX: (x, mx = null, my = null) => set({ hoveredX: x, mouseX: mx, mouseY: my }),
    setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
    setView: (view) => set({ currentView: view }),
    setAiStudioOpen: (open) => set({ aiStudioOpen: open }),
    setAiUserLevel: (level) => set({ aiUserLevel: level }),
    setEnvironment: (id) => set({ activeEnvironment: id }),
    setPerformanceMonitorOpen: (open) => set({ performanceMonitorOpen: open }),
    
    loadPreset: (model) => {
      engineInstance.calculate(model, false);
      set({
        model,
        selectedObjectId: null,
        currentView: 'workspace',
        ghostModel: null,
        ghostAnalysisResult: null
      });
    },
  };
});
