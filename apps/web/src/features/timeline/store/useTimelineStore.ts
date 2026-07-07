import { create } from 'zustand';
import type { TimelineStage, TimelineEvent, ToolExecutionRecord, TimelineStageId } from '../types';

interface TimelineState {
  isExpanded: boolean;
  panelHeight: number;
  isPaused: boolean;
  
  stages: TimelineStage[];
  tools: ToolExecutionRecord[];
  contextSnapshot: any | null;
  rawEvents: TimelineEvent[];
  
  // Replay State
  isReplaying: boolean;
  replayIndex: number;
  playbackSpeed: number;
  
  // Actions
  toggleExpanded: () => void;
  setHeight: (height: number) => void;
  setPaused: (paused: boolean) => void;
  
  // Replay Actions
  startReplay: () => void;
  stopReplay: () => void;
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBack: () => void;
  setSpeed: (speed: number) => void;
  
  // Event Processing
  reset: () => void;
  addEvent: (type: string, payload: any) => void;
}

const INITIAL_STAGES: TimelineStage[] = [
  { id: 'user_request', title: 'User Request', description: 'Receiving input', status: 'pending', progress: 0, events: [] },
  { id: 'intent_recognition', title: 'Intent Recognition', description: 'Analyzing intent', status: 'pending', progress: 0, events: [] },
  { id: 'context_collection', title: 'Context Collection', description: 'Gathering workspace state', status: 'pending', progress: 0, events: [] },
  { id: 'planning', title: 'Planning', description: 'Developing execution strategy', status: 'pending', progress: 0, events: [] },
  { id: 'graph_construction', title: 'Graph Construction', description: 'Building execution graph', status: 'pending', progress: 0, events: [] },
  { id: 'scheduler', title: 'Scheduler', description: 'Orchestrating tasks', status: 'pending', progress: 0, events: [] },
  { id: 'tool_execution', title: 'Tool Execution', description: 'Running engineering tools', status: 'pending', progress: 0, events: [] },
  { id: 'engineering_analysis', title: 'Engineering Analysis', description: 'Processing results', status: 'pending', progress: 0, events: [] },
  { id: 'result_generation', title: 'Result Generation', description: 'Formulating response', status: 'pending', progress: 0, events: [] },
  { id: 'response', title: 'Response', description: 'Streaming to user', status: 'pending', progress: 0, events: [] },
];

export const useTimelineStore = create<TimelineState>((set, get) => ({
  isExpanded: false,
  panelHeight: 300,
  isPaused: false,
  
  stages: [...INITIAL_STAGES],
  tools: [],
  contextSnapshot: null,
  rawEvents: [],
  
  isReplaying: false,
  replayIndex: 0,
  playbackSpeed: 1,
  
  toggleExpanded: () => set(state => ({ isExpanded: !state.isExpanded })),
  setHeight: (height) => set({ panelHeight: height }),
  setPaused: (paused) => set({ isPaused: paused }),

  startReplay: () => set({ isReplaying: true, replayIndex: 0, isPaused: false }),
  stopReplay: () => set({ isReplaying: false }),
  play: () => set({ isPaused: false }),
  pause: () => set({ isPaused: true }),
  stepForward: () => set(state => ({ replayIndex: Math.min(state.replayIndex + 1, state.rawEvents.length) })),
  stepBack: () => set(state => ({ replayIndex: Math.max(state.replayIndex - 1, 0) })),
  setSpeed: (speed) => set({ playbackSpeed: speed }),
  
  reset: () => set({
    stages: INITIAL_STAGES.map(s => ({ ...s, status: 'pending', progress: 0, events: [], startTime: undefined, endTime: undefined, durationMs: undefined })),
    tools: [],
    contextSnapshot: null,
    rawEvents: []
  }),
  
  addEvent: (type, payload) => {
    const { isPaused, rawEvents, stages, tools } = get();
    if (isPaused) return;

    const event: TimelineEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      timestamp: new Date().toISOString(),
      payload
    };

    const newRawEvents = [...rawEvents, event];
    let newStages = [...stages];
    let newTools = [...tools];
    let newContext = get().contextSnapshot;

    const updateStage = (id: TimelineStageId, updates: Partial<TimelineStage>) => {
      newStages = newStages.map(s => s.id === id ? { ...s, ...updates } : s);
    };

    // Very basic mapping logic based on our StreamEvent types
    switch (type) {
      case 'message_started':
        get().reset(); // Reset on new message
        newStages = [...INITIAL_STAGES];
        updateStage('user_request', { status: 'completed', progress: 100, startTime: event.timestamp, endTime: event.timestamp });
        updateStage('intent_recognition', { status: 'active', progress: 50, startTime: event.timestamp });
        break;

      case 'planning_started':
        updateStage('intent_recognition', { status: 'completed', progress: 100, endTime: event.timestamp });
        updateStage('planning', { status: 'active', progress: 50, startTime: event.timestamp });
        break;
        
      case 'planning_completed':
        updateStage('planning', { status: 'completed', progress: 100, endTime: event.timestamp });
        updateStage('context_collection', { status: 'active', progress: 50, startTime: event.timestamp });
        break;
        
      case 'context_updated':
        newContext = payload.contextData;
        updateStage('context_collection', { status: 'completed', progress: 100, endTime: event.timestamp });
        break;
        
      case 'execution_graph_built':
        updateStage('graph_construction', { status: 'completed', progress: 100, startTime: event.timestamp, endTime: event.timestamp });
        break;
        
      case 'scheduler_started':
        updateStage('scheduler', { status: 'active', progress: 50, startTime: event.timestamp });
        updateStage('tool_execution', { status: 'active', progress: 10, startTime: event.timestamp });
        break;

      case 'tool_start':
        newTools.push({
          id: `tool_${Date.now()}`,
          toolName: payload.toolId,
          status: 'active',
          startTime: event.timestamp
        });
        updateStage('tool_execution', { progress: Math.min(90, newStages.find(s => s.id === 'tool_execution')!.progress + 10) });
        break;

      case 'tool_end':
        newTools = newTools.map(t => 
          t.toolName === payload.toolId && t.status === 'active' 
            ? { ...t, status: 'completed', endTime: event.timestamp, result: payload.result }
            : t
        );
        break;
        
      case 'tool_failed':
        newTools = newTools.map(t => 
          t.toolName === payload.toolId && t.status === 'active' 
            ? { ...t, status: 'failed', endTime: event.timestamp, error: payload.error }
            : t
        );
        break;

      case 'streaming_started':
        updateStage('scheduler', { status: 'completed', progress: 100, endTime: event.timestamp });
        updateStage('tool_execution', { status: 'completed', progress: 100, endTime: event.timestamp });
        updateStage('engineering_analysis', { status: 'completed', progress: 100, startTime: event.timestamp, endTime: event.timestamp });
        updateStage('result_generation', { status: 'completed', progress: 100, startTime: event.timestamp, endTime: event.timestamp });
        updateStage('response', { status: 'active', progress: 50, startTime: event.timestamp });
        break;

      case 'streaming_completed':
      case 'conversation_completed':
        updateStage('response', { status: 'completed', progress: 100, endTime: event.timestamp });
        break;

      case 'conversation_failed':
      case 'error':
        // Mark any active stage as failed
        newStages = newStages.map(s => s.status === 'active' ? { ...s, status: 'failed', progress: 100, error: payload.error || payload.message, endTime: event.timestamp } : s);
        break;
    }

    set({ rawEvents: newRawEvents, stages: newStages, tools: newTools, contextSnapshot: newContext });
  }
}));
