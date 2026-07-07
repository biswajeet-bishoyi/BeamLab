export type StreamEvent = 
  | { type: 'text'; payload: string }
  | { type: 'tool_start'; payload: { toolId: string } }
  | { type: 'tool_end'; payload: { toolId: string; result: any } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'approval_required'; payload: { toolId: string; details: any } }
  | { type: 'message_started'; payload: { prompt: string } }
  | { type: 'planning_started'; payload: {} }
  | { type: 'planning_completed'; payload: { plan: any } }
  | { type: 'context_updated'; payload: { contextData: any } }
  | { type: 'execution_graph_built'; payload: { graph?: any } }
  | { type: 'scheduler_started'; payload: {} }
  | { type: 'tool_failed'; payload: { toolId: string; error: string } }
  | { type: 'streaming_started'; payload: {} }
  | { type: 'streaming_completed'; payload: {} }
  | { type: 'conversation_completed'; payload: {} }
  | { type: 'conversation_failed'; payload: { error: string } };

export class StreamingEngine {
  /**
   * Wraps an async generator of stream events, handling backpressure and formatting
   * for Server-Sent Events (SSE).
   */
  public async *stream(generator: AsyncGenerator<StreamEvent, void, unknown>): AsyncGenerator<string, void, unknown> {
    for await (const event of generator) {
      yield `data: ${JSON.stringify(event)}\n\n`;
    }
  }
}

export const streamingEngine = new StreamingEngine();
