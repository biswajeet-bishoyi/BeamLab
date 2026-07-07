
import { IArchieClient } from '../interfaces';
import { ArchieConversationState, ArchieMessage, ArchiePlanStep, ArchieExecutionTask } from '../types';

export class MockArchieClient implements IArchieClient {
  private state: ArchieConversationState = 'idle';
  private messages: ArchieMessage[] = [];
  private plan: ArchiePlanStep[] = [];
  private execution: ArchieExecutionTask[] = [];
  
  private listeners: Set<() => void> = new Set();
  private abortController: AbortController | null = null;

  constructor() {
    // Initial mock data
    this.messages = [
      { id: 'm1', role: 'assistant', content: 'Hello! I am Archie. How can I help you design this structure today?', timestamp: new Date().toISOString(), status: 'complete' }
    ];
  }

  getState() { return this.state; }
  getMessages() { return this.messages; }
  getPlan() { return this.plan; }
  getExecution() { return this.execution; }

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.state = 'cancelled';
      this.notify();
    }
  }

  async sendMessage(content: string) {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Add user message
    this.messages = [...this.messages, {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      status: 'sent'
    }];
    
    this.state = 'submitting';
    this.notify();

    try {
      await this.sleep(600, signal);
      
      // Planning phase
      this.state = 'planning';
      this.plan = [
        { id: 'p1', title: 'Analyze Request', description: 'Parse intent and extract structural parameters.', status: 'active' },
        { id: 'p2', title: 'Generate Solution', description: 'Formulate structural recommendations.', status: 'pending' }
      ];
      this.notify();
      
      await this.sleep(800, signal);
      this.plan[0].status = 'completed';
      this.plan[1].status = 'active';
      this.notify();

      await this.sleep(800, signal);
      this.plan[1].status = 'completed';

      // Streaming phase
      this.state = 'streaming';
      const responseId = (Date.now() + 1).toString();
      this.messages = [...this.messages, {
        id: responseId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        status: 'streaming'
      }];
      this.notify();

      const fullText = "Based on your request, I recommend analyzing the **W12x40** section.\n\nHere is the calculation:\n$$ M_n = F_y Z_x $$\n\nLet me know if you want me to run the Execution Engine to verify this.";
      let currentText = "";
      
      for (const char of fullText.split('')) {
        await this.sleep(30, signal);
        currentText += char;
        this.messages = this.messages.map(m => 
          m.id === responseId ? { ...m, content: currentText } : m
        );
        this.notify();
      }

      this.messages = this.messages.map(m => 
        m.id === responseId ? { ...m, status: 'complete' } : m
      );
      this.state = 'completed';
      this.notify();

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Message cancelled');
      } else {
        this.state = 'failed';
        this.notify();
      }
    }
  }

  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
      const timer = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  }
}
