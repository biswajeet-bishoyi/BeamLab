import crypto from 'crypto';

export interface TraceContext {
  correlationId: string;
  requestId: string;
  executionId?: string;
  graphId?: string;
  schedulerId: string;
  nodeId?: string;
}

export class TracingEngine {
  private schedulerId: string;

  constructor() {
    this.schedulerId = crypto.randomUUID();
  }

  public createContext(requestId: string): TraceContext {
    return {
      correlationId: crypto.randomUUID(),
      requestId,
      schedulerId: this.schedulerId
    };
  }

  public withGraph(context: TraceContext, graphId: string): TraceContext {
    return { ...context, graphId, executionId: crypto.randomUUID() };
  }

  public withNode(context: TraceContext, nodeId: string): TraceContext {
    return { ...context, nodeId };
  }

  public log(context: TraceContext, level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      trace: context,
      data
    };
    
    // Structured Logging
    console.log(JSON.stringify(entry));
  }
}
