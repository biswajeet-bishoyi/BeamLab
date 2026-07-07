import { ArchieConversationState, ArchieExecutionTask, ArchieMessage, ArchiePlanStep } from '../types';

export interface TransportMessagePayload {
  prompt: string;
  projectId: string;
  userId: string;
}

export interface ITransport {
  sendMessage(payload: TransportMessagePayload): void;
  cancel(): void;
  subscribe(callback: (event: any) => void): () => void;
}
