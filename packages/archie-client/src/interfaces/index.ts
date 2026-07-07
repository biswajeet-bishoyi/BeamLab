
import { ArchieConversationState, ArchieMessage, ArchiePlanStep, ArchieExecutionTask } from '../types';

export interface IArchieClient {
  // State
  getState(): ArchieConversationState;
  getMessages(): ArchieMessage[];
  getPlan(): ArchiePlanStep[];
  getExecution(): ArchieExecutionTask[];
  
  // Actions
  sendMessage(content: string): Promise<void>;
  cancel(): void;
  
  // Subscriptions (Simple callback registry for React integration)
  subscribe(callback: () => void): () => void;
}
