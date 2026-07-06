import { ExecutionGraph } from '@beamlab/execution-graph';
import { HealthRegistry } from '../health/HealthRegistry';
import { TracingEngine, TraceContext } from '../observability/TracingEngine';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { SchedulerEventPublisher } from '../events/SchedulerEventPublisher';
import { GraphSecurityValidator } from '../security/GraphValidator';

export class SchedulerRuntime {
  public health: HealthRegistry;
  public tracing: TracingEngine;
  public metrics: MetricsCollector;
  public events: SchedulerEventPublisher;
  private security: GraphSecurityValidator;

  private queue: Array<{ graph: ExecutionGraph, trace: TraceContext, queuedAt: number }> = [];
  private isRunning: boolean = false;
  private activeExecutions = 0;

  constructor() {
    this.health = new HealthRegistry();
    this.tracing = new TracingEngine();
    this.metrics = new MetricsCollector();
    this.events = new SchedulerEventPublisher(this.tracing);
    this.security = new GraphSecurityValidator();
  }

  public async start() {
    this.health.setStatus('Starting');
    const startupContext = this.tracing.createContext('system-startup');
    this.events.publish('SchedulerStarted', startupContext);
    
    this.isRunning = true;
    this.health.setStatus('Healthy');
    
    // Simulate event loop (Provider-agnostic loop)
    this.processQueue();
  }

  public async stop() {
    this.health.setStatus('Stopping');
    this.isRunning = false;
    const shutdownContext = this.tracing.createContext('system-shutdown');
    this.events.publish('SchedulerStopped', shutdownContext);
    this.health.setStatus('Degraded'); // Or offline, keeping Degraded for now to represent stopping
  }

  public enqueueGraph(graph: ExecutionGraph, requestId: string): boolean {
    const t0 = performance.now();
    
    try {
      this.security.validateForExecution(graph);
    } catch (err: any) {
      this.health.reportError(err);
      return false;
    }

    const baseContext = this.tracing.createContext(requestId);
    const trace = this.tracing.withGraph(baseContext, graph.id);
    
    this.queue.push({ graph, trace, queuedAt: performance.now() });
    
    this.metrics.recordQueueLength(this.queue.length);
    this.events.publish('GraphQueued', trace, { graphId: graph.id });

    const insertionLatency = performance.now() - t0;
    // Log if it exceeds the 5ms budget
    if (insertionLatency > 5) {
      this.tracing.log(trace, 'warn', `Queue insertion budget exceeded: ${insertionLatency.toFixed(2)}ms`);
    }

    return true;
  }

  private async processQueue() {
    if (!this.isRunning) return;

    if (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        this.metrics.recordQueueLength(this.queue.length);
        const waitTime = performance.now() - item.queuedAt;
        this.metrics.recordWaitTime(waitTime);
        
        await this.executeGraph(item.graph, item.trace);
      }
    }

    // Schedule next tick
    setTimeout(() => this.processQueue(), 10);
  }

  private async executeGraph(graph: ExecutionGraph, trace: TraceContext) {
    const t0 = performance.now();
    this.activeExecutions++;
    this.metrics.setActiveExecutions(this.activeExecutions);
    
    this.events.publish('GraphStarted', trace, { graphId: graph.id });

    try {
      // Very basic execution simulation to measure node scheduling latency (<2ms)
      for (const node of graph.nodes) {
        const nodeT0 = performance.now();
        const nodeTrace = this.tracing.withNode(trace, node.id);
        
        this.events.publish('NodeReady', nodeTrace);
        this.events.publish('NodeStarted', nodeTrace);
        
        const schedulingLatency = performance.now() - nodeT0;
        if (schedulingLatency > 2) {
          this.tracing.log(nodeTrace, 'warn', `Node scheduling budget exceeded: ${schedulingLatency.toFixed(2)}ms`);
        }

        // Simulate actual work...
        await new Promise(resolve => setImmediate(resolve));

        this.events.publish('NodeCompleted', nodeTrace);
      }

      const totalTime = performance.now() - t0;
      this.tracing.log(trace, 'info', `Graph executed in ${totalTime.toFixed(2)}ms`);
      
      this.events.publish('GraphCompleted', trace);
      this.metrics.recordExecution('success');
    } catch (err: any) {
      this.health.reportError(err);
      this.events.publish('GraphFailed', trace, { error: err.message });
      this.metrics.recordExecution('failure');
    } finally {
      this.activeExecutions--;
      this.metrics.setActiveExecutions(this.activeExecutions);
    }
  }
}
