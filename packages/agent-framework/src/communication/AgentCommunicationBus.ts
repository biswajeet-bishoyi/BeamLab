export type MessageType = 
  | 'task_request'
  | 'task_response'
  | 'status_update'
  | 'knowledge_query'
  | 'knowledge_response'
  | 'policy_check'
  | 'policy_result'
  | 'error'
  | 'cancel';

export type PriorityLevel = 'low' | 'normal' | 'high' | 'critical';

export interface AgentMessage {
  messageId: string;
  sender: string;
  recipient: string;
  conversationId: string;
  executionId: string;
  timestamp: number;
  messageType: MessageType;
  payload: Record<string, any>;
  correlationId?: string;
  priority: PriorityLevel;
}

type MessageHandler = (message: AgentMessage) => void;

/**
 * Standardize inter-agent messaging.
 * All messages flow through the Agent Communication Bus.
 */
export class AgentCommunicationBus {
  private handlers = new Map<string, Set<MessageHandler>>();

  /**
   * Subscribe to messages for a specific agent.
   */
  public subscribe(agentId: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(agentId)) {
      this.handlers.set(agentId, new Set());
    }
    this.handlers.get(agentId)!.add(handler);

    return () => {
      this.handlers.get(agentId)?.delete(handler);
    };
  }

  /**
   * Send a message to a recipient.
   */
  public publish(message: AgentMessage): void {
    const recipientHandlers = this.handlers.get(message.recipient);
    if (recipientHandlers) {
      recipientHandlers.forEach(handler => handler(message));
    }
  }

  /**
   * Broadcast a message to all agents (e.g. system shutdown).
   */
  public broadcast(message: AgentMessage): void {
    this.handlers.forEach(agentSet => {
      agentSet.forEach(handler => handler(message));
    });
  }
}
