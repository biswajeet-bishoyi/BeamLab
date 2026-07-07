import { requestPipeline, RequestPayload } from '../pipeline/RequestPipeline';
import { streamingEngine } from '../streaming/StreamingEngine';

export class ArchieRuntime {
  /**
   * Primary entry point for real-time interactions with Archie.
   * Streams SSE formatted data back to the client.
   */
  public async *streamRequest(payload: RequestPayload, signal?: AbortSignal): AsyncGenerator<string, void, unknown> {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const eventStream = requestPipeline.processStream(payload, traceId, signal);
    
    yield* streamingEngine.stream(eventStream);
  }
}

export const archieRuntime = new ArchieRuntime();
