
export type ArchieConversationState = 
  | 'idle' 
  | 'submitting' 
  | 'planning' 
  | 'executing' 
  | 'streaming' 
  | 'completed' 
  | 'cancelled' 
  | 'failed';

export interface ArchieMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'streaming' | 'complete' | 'error';
}

export interface ArchiePlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface ArchieExecutionTask {
  id: string;
  name: string;
  progress: number; // 0-100
  status: 'queued' | 'running' | 'completed' | 'failed';
}
