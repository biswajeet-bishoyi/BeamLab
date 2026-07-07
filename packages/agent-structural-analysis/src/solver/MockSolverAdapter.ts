import { ISolverAdapter } from './ISolverAdapter';
import { SolverRequest, SolverResponse, SolverCapabilities, SolverHealth } from './SolverTypes';

export class MockSolverAdapter implements ISolverAdapter {
  public id = 'mock-solver-01';
  public name = 'BeamLab Mock Solver';

  public async getCapabilities(): Promise<SolverCapabilities> {
    return {
      supportedStrategies: ['linear-static', 'modal'],
      maxNodes: 10000,
      maxElements: 10000
    };
  }

  public async checkHealth(): Promise<SolverHealth> {
    return {
      status: 'online',
      lastCheck: Date.now(),
      latencyMs: 15
    };
  }

  public async solve(request: SolverRequest): Promise<SolverResponse> {
    // Simulate solver delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      executionTimeMs: 500,
      results: {
        maxDeflection: 15.4, // mm
        maxMoment: 245.2, // kNm
        criticalMembers: ['B12', 'C4']
      }
    };
  }
}
