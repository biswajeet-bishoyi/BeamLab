import { SolverRequest, SolverResponse, SolverCapabilities, SolverHealth } from './SolverTypes';

export interface ISolverAdapter {
  id: string;
  name: string;
  
  getCapabilities(): Promise<SolverCapabilities>;
  checkHealth(): Promise<SolverHealth>;
  solve(request: SolverRequest): Promise<SolverResponse>;
}
