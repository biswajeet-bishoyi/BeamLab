export type TimelineStageId = 
  | 'user_request'
  | 'intent_recognition'
  | 'context_collection'
  | 'planning'
  | 'graph_construction'
  | 'scheduler'
  | 'tool_execution'
  | 'engineering_analysis'
  | 'result_generation'
  | 'response';

export type TimelineStageStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

export interface TimelineStage {
  id: TimelineStageId;
  title: string;
  description: string;
  status: TimelineStageStatus;
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  progress: number;
  events: TimelineEvent[];
  error?: string;
}

export interface ToolExecutionRecord {
  id: string;
  toolName: string;
  status: TimelineStageStatus;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  result?: any;
  error?: string;
}
