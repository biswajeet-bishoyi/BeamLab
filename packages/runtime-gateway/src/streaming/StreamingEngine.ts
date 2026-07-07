export type StreamEvent = 
  | { type: 'text'; payload: string }
  | { type: 'tool_start'; payload: { toolId: string } }
  | { type: 'tool_end'; payload: { toolId: string; result: any } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'approval_required'; payload: { toolId: string; details: any } };

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
