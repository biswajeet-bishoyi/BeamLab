import { ISolverService } from '../services/ISolverService';
import { ISolverRequest, ISolverJob, ISolverResult } from '../interfaces/IJob';
import { ISolver, ISolverCapabilities } from '../interfaces/ISolver';

// In a real implementation, this would likely wrap IPC, WebSocket, or HTTP calls
// communicating with the SolverRuntime.
export class SolverClient implements ISolverService {
  constructor(private transportProtocol: any) {}

  public async getAvailableSolvers(): Promise<ISolver[]> {
    throw new Error('Not implemented');
  }

  public async getSolverCapabilities(solverId: string): Promise<ISolverCapabilities> {
    throw new Error('Not implemented');
  }

  public async submitJob(request: ISolverRequest): Promise<ISolverJob> {
    throw new Error('Not implemented');
  }

  public async getJobStatus(jobId: string): Promise<ISolverJob> {
    throw new Error('Not implemented');
  }

  public async cancelJob(jobId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  public async waitForJobCompletion(jobId: string): Promise<ISolverResult> {
    throw new Error('Not implemented');
  }
}
