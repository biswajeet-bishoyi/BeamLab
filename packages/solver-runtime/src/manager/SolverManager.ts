import { ISolver } from '@beamlab/solver-client';
import { SolverRegistry } from '../registry/SolverRegistry';

export class SolverManager {
  constructor(private registry: SolverRegistry) {}

  public selectSolverForAnalysis(analysisType: string): ISolver | undefined {
    const solvers = this.registry.getAvailableSolvers();
    
    // Sort by health (online first) and then simply find the first that supports the analysis type.
    const candidates = solvers.filter(s => 
      s.health.status === 'online' && 
      s.capabilities.supportedAnalysisTypes.includes(analysisType)
    );

    return candidates.length > 0 ? candidates[0] : undefined;
  }
}
