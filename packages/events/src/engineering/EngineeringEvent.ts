export interface EngineeringEvent {
  /**
   * The base type of the engineering event (e.g., 'Analysis', 'Design', 'Optimization', 'Compliance').
   */
  domain: string;
  
  /**
   * Specific event type.
   */
  type: string;
  
  /**
   * Timestamp of the event in milliseconds.
   */
  timestamp: number;
  
  /**
   * Correlation ID for tracing across agents.
   */
  correlationId?: string;

  /**
   * Domain-specific payload.
   */
  payload: any;
}
