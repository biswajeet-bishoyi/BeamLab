import { AgentMessage } from '../communication/AgentCommunicationBus';

export interface ExecutionTrace {
  executionId: string;
  agentChain: string[];
  negotiationPayload?: any;
  policyDecisions: string[];
  knowledgeRetrieved: string[];
  resourcesUsed: string[];
  messagesSent: AgentMessage[];
  timelineEvents: { timestamp: number; event: string }[];
  errors: Error[];
  retries: number;
  finalOutcome: 'success' | 'failure' | 'cancelled' | 'pending';
}

export class ExecutionTraceTracker {
  private traces = new Map<string, ExecutionTrace>();

  public startTrace(executionId: string, initialAgent: string) {
    this.traces.set(executionId, {
      executionId,
      agentChain: [initialAgent],
      policyDecisions: [],
      knowledgeRetrieved: [],
      resourcesUsed: [],
      messagesSent: [],
      timelineEvents: [{ timestamp: Date.now(), event: 'Execution Started' }],
      errors: [],
      retries: 0,
      finalOutcome: 'pending'
    });
  }

  public logEvent(executionId: string, event: string) {
    const trace = this.traces.get(executionId);
    if (trace) {
      trace.timelineEvents.push({ timestamp: Date.now(), event });
    }
  }

  public recordMessage(executionId: string, message: AgentMessage) {
    const trace = this.traces.get(executionId);
    if (trace) {
      trace.messagesSent.push(message);
    }
  }

  public recordError(executionId: string, error: Error) {
    const trace = this.traces.get(executionId);
    if (trace) {
      trace.errors.push(error);
      this.logEvent(executionId, `Error encountered: ${error.message}`);
    }
  }

  public finalizeTrace(executionId: string, outcome: 'success' | 'failure' | 'cancelled') {
    const trace = this.traces.get(executionId);
    if (trace) {
      trace.finalOutcome = outcome;
      this.logEvent(executionId, `Execution Finished with outcome: ${outcome}`);
    }
  }

  public getTrace(executionId: string): ExecutionTrace | undefined {
    return this.traces.get(executionId);
  }
}
