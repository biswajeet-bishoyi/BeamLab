import { ISolverAdapter as NewISolverAdapter } from '@beamstudio/solver-client';
import { SolverRequest, SolverResponse, SolverCapabilities, SolverHealth } from './SolverTypes';

/** 
 * @deprecated Use ISolverAdapter from '@beamstudio/solver-client' instead.
 */
export interface ISolverAdapter {
  id: string;
  name: string;
  
  getCapabilities(): Promise<SolverCapabilities>;
  checkHealth(): Promise<SolverHealth>;
  solve(request: SolverRequest): Promise<SolverResponse>;
}
