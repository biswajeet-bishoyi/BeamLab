export interface WorkspaceEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

export interface SelectionState {
  current: string[];
  history: string[][];
  metadata: Record<string, any>;
  origin: string;
}

export interface FocusState {
  contextId: string | null;
  relatedEntities: string[];
}
