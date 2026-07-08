import { ITransport } from '../transport/ITransport';
import { 
  ArchieConversationState, 
  ArchieExecutionTask, 
  ArchieMessage, 
  ArchiePlanStep 
} from '../types';

export class ArchieClient {
  private transport: ITransport;
  
  private state: ArchieConversationState = 'idle';
  private messages: ArchieMessage[] = [];
  private plan: ArchiePlanStep[] = [];
  private execution: ArchieExecutionTask[] = [];
  
  private listeners: Set<(event?: any) => void> = new Set();
  
  // Expose the current context from the backend
  public contextData: any = null;

  constructor(transport: ITransport) {
    this.transport = transport;
    this.transport.subscribe(this.handleTransportEvent.bind(this));
  }

  // State Getters
  public getState(): ArchieConversationState { return this.state; }
  public getMessages(): ArchieMessage[] { return this.messages; }
  public getPlan(): ArchiePlanStep[] { return this.plan; }
  public getExecution(): ArchieExecutionTask[] { return this.execution; }

  // Actions
  public sendMessage(content: string, projectId: string = "default_project", userId: string = "default_user"): void {
    const userMsg: ArchieMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      status: 'complete'
    };
    
    this.messages = [...this.messages, userMsg];
    this.state = 'submitting';
    this.emit();

    this.transport.sendMessage({
      prompt: content,
      projectId,
      userId
    });
  }

  public cancel(): void {
    this.transport.cancel();
    this.state = 'cancelled';
    this.emit();
  }

  public subscribe(callback: (event?: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event?: any) {
    this.listeners.forEach(cb => cb(event));
  }

  // Internal Event Handler
  private handleTransportEvent(event: any) {
    switch (event.type) {
      case 'message_started':
        this.messages = [
          ...this.messages,
          {
            id: `msg_ast_${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            status: 'streaming'
          }
        ];
        break;

      case 'planning_started':
        this.state = 'planning';
        break;

      case 'planning_completed': {
        // The backend returns a plan object, which we map to ArchiePlanStep
        const rawPlan = event.payload.plan;
        if (rawPlan && Array.isArray(rawPlan.steps)) {
          this.plan = rawPlan.steps.map((s: any, idx: number) => ({
            id: `plan_${idx}`,
            title: s.action || 'Task',
            description: s.reasoning || '',
            status: 'pending' // UI defaults to pending until we get tool executions
          }));
        }
        break;
      }

      case 'context_updated':
        this.contextData = event.payload.contextData;
        break;

      case 'execution_graph_built': {
        this.state = 'executing';
        const graph = event.payload.graph;
        if (Array.isArray(graph)) {
          this.execution = graph.map((t: any, idx: number) => ({
            id: `task_${idx}_${t.name}`,
            name: t.name,
            progress: 0,
            status: 'queued'
          }));
        }
        break;
      }

      case 'scheduler_started':
        this.state = 'executing';
        break;

      case 'tool_start':
        this.execution = this.execution.map(t => 
          t.name === event.payload.toolId ? { ...t, status: 'running', progress: 50 } : t
        );
        this.plan = this.plan.map(p => 
          p.title === event.payload.toolId ? { ...p, status: 'active' } : p
        );
        break;

      case 'tool_end':
        this.execution = this.execution.map(t => 
          t.name === event.payload.toolId ? { ...t, status: 'completed', progress: 100 } : t
        );
        this.plan = this.plan.map(p => 
          p.title === event.payload.toolId ? { ...p, status: 'completed' } : p
        );
        break;

      case 'tool_failed':
        this.execution = this.execution.map(t => 
          t.name === event.payload.toolId ? { ...t, status: 'failed', progress: 0 } : t
        );
        this.plan = this.plan.map(p => 
          p.title === event.payload.toolId ? { ...p, status: 'failed' } : p
        );
        break;

      case 'streaming_started':
        this.state = 'streaming';
        break;

      case 'text':
        if (this.messages.length > 0) {
          const lastIndex = this.messages.length - 1;
          const lastMsg = this.messages[lastIndex];
          if (lastMsg.role === 'assistant') {
            this.messages[lastIndex] = {
              ...lastMsg,
              content: lastMsg.content + event.payload
            };
          }
        }
        break;

      case 'streaming_completed':
      case 'conversation_completed':
        this.state = 'completed';
        if (this.messages.length > 0) {
          const lastIndex = this.messages.length - 1;
          const lastMsg = this.messages[lastIndex];
          if (lastMsg.role === 'assistant') {
            this.messages[lastIndex] = {
              ...lastMsg,
              status: 'complete'
            };
          }
        }
        break;

      case 'conversation_failed':
      case 'error':
        this.state = 'failed';
        this.messages = [
          ...this.messages,
          {
            id: `err_${Date.now()}`,
            role: 'system',
            content: `**Runtime Error:** ${event.payload.error || event.payload.message}`,
            timestamp: new Date().toISOString(),
            status: 'error'
          }
        ];
        break;
    }
    
    this.emit(event);
  }
}
