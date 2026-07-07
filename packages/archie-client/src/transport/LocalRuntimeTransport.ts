import { ITransport, TransportMessagePayload } from './ITransport';
import { archieRuntime } from '@beamlab/runtime-gateway';

export class LocalRuntimeTransport implements ITransport {
  private listeners: Set<(event: any) => void> = new Set();
  private abortController: AbortController | null = null;

  public subscribe(callback: (event: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: any) {
    this.listeners.forEach(cb => cb(event));
  }

  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public async sendMessage(payload: TransportMessagePayload): Promise<void> {
    this.cancel();
    this.abortController = new AbortController();

    try {
      const stream = archieRuntime.streamRequest(payload, this.abortController.signal);
      
      for await (const chunk of stream) {
        // The StreamingEngine returns strings like: `data: {"type":"...","payload":...}\n\n`
        if (chunk.startsWith('data: ')) {
          const jsonStr = chunk.replace(/^data: /, '').trim();
          if (jsonStr) {
            try {
              const event = JSON.parse(jsonStr);
              this.emit(event);
            } catch (err) {
              console.error("LocalRuntimeTransport: failed to parse chunk", chunk, err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.emit({ type: 'conversation_failed', payload: { error: 'Aborted by user' } });
      } else {
        this.emit({ type: 'conversation_failed', payload: { error: err.message || 'Unknown transport error' } });
      }
    } finally {
      this.abortController = null;
    }
  }
}
