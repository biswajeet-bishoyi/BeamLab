import type { StructuralModel } from '@beamworks/core-engine/model/types';
import type { WorkerRequest, WorkerResponse } from '../workers/analysis.worker';

type EventCallback = (data: any) => void;

export class AnalysisEngine {
  private worker: Worker;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private calculationCount = 0;
  
  // Last metrics
  public lastCalcTime = 0;

  constructor() {
    this.worker = new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), { type: 'module' });
    
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id, type, result, error, metrics } = e.data;
      
      this.lastCalcTime = metrics.calculationTimeMs;
      
      this.emit('analysis:complete', { id, type, result, error, metrics });
    };
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  public emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  public calculate(model: StructuralModel, isPreview = false): string {
    const id = `req_${++this.calculationCount}`;
    const type = isPreview ? 'PREVIEW' : 'COMMIT';
    
    this.emit('analysis:start', { id, type, model });
    
    const request: WorkerRequest = { id, type, model };
    this.worker.postMessage(request);
    
    return id;
  }

  public terminate() {
    this.worker.terminate();
  }
}

export const engineInstance = new AnalysisEngine();
