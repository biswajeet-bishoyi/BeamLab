import { ISolverRequest, ISolverJob, ISolverResult } from '../interfaces/IJob';
import { ISolver, ISolverCapabilities } from '../interfaces/ISolver';

export interface ISolverService {
  getAvailableSolvers(): Promise<ISolver[]>;
  getSolverCapabilities(solverId: string): Promise<ISolverCapabilities>;
  submitJob(request: ISolverRequest): Promise<ISolverJob>;
  getJobStatus(jobId: string): Promise<ISolverJob>;
  cancelJob(jobId: string): Promise<void>;
  waitForJobCompletion(jobId: string): Promise<ISolverResult>;
}
