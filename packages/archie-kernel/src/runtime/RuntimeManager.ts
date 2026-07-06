import { RuntimeStatus } from '../api/IArchieKernel';
import { SchedulerRuntime } from '@beamlab/task-scheduler';

export class RuntimeManager {
  private status: RuntimeStatus = { state: 'stopped', uptime: 0 };
  private startTime: number = 0;
  public readonly scheduler: SchedulerRuntime;

  constructor() {
    this.scheduler = new SchedulerRuntime();
  }

  async start(): Promise<void> {
    if (this.status.state === 'running') return;
    this.status.state = 'starting';
    this.startTime = Date.now();
    
    // Simulate initialization
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Start Scheduler and verify Health
    await this.scheduler.start();
    if (this.scheduler.health.getStatus() !== 'Healthy') {
       throw new Error('Scheduler failed to start');
    }
    
    this.status.state = 'running';
  }

  async shutdown(): Promise<void> {
    this.status.state = 'stopping';
    
    await this.scheduler.stop();
    // Simulate teardown
    await new Promise(resolve => setTimeout(resolve, 50));
    
    this.status.state = 'stopped';
    this.startTime = 0;
  }

  getStatus(): RuntimeStatus {
    if (this.status.state === 'running') {
      this.status.uptime = Date.now() - this.startTime;
    }
    return this.status;
  }
}
