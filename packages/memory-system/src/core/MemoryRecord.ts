export type MemoryScope = 
  | 'session'
  | 'execution'
  | 'conversation'
  | 'workspace'
  | 'agent_private'
  | 'agent_shared'
  | 'knowledge_adapter'
  | 'organization'
  | 'cloud'
  | 'long_term';

export interface MemoryRecord {
  /**
   * Unique ID for this memory entry
   */
  id: string;

  /**
   * The scope of this memory
   */
  scope: MemoryScope;

  /**
   * The ID of the owner of this memory (e.g., agent ID, execution ID)
   */
  ownerId: string;

  /**
   * Optional session ID if this memory is tied to a session
   */
  sessionId?: string;

  /**
   * Optional execution ID if this memory is tied to an execution
   */
  executionId?: string;

  /**
   * Creation timestamp
   */
  timestamp: number;

  /**
   * Last updated timestamp
   */
  updatedAt: number;

  /**
   * The actual stored data
   */
  payload: Record<string, any>;

  /**
   * The version of this memory entry for concurrency control
   */
  version: number;

  /**
   * Flexible metadata (e.g., tags, confidence)
   */
  metadata?: Record<string, any>;

  /**
   * Future: Time to live
   */
  ttl?: number;

  /**
   * Future: Importance score for prioritization
   */
  importance?: number;

  /**
   * Future: Confidence score for agent reasoning
   */
  confidence?: number;
}
