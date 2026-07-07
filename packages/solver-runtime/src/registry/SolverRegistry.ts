import { ISolver, ISolverCapabilities, ISolverHealth } from '@beamlab/solver-client';
import { SolverAdapterRegistry } from './SolverAdapterRegistry';

export class SolverRegistry {
  constructor(private adapterRegistry: SolverAdapterRegistry) {}

  public getAvailableSolvers(): ISolver[] {
    return this.adapterRegistry.getAllAdapters().map(adapter => ({
      id: adapter.id,
      name: adapter.name,
      version: adapter.version,
      capabilities: adapter.capabilities,
      health: adapter.health
    }));
  }

  public getSolverCapabilities(solverId: string): ISolverCapabilities | undefined {
    return this.adapterRegistry.getAdapter(solverId)?.capabilities;
  }

  public getSolverHealth(solverId: string): ISolverHealth | undefined {
    return this.adapterRegistry.getAdapter(solverId)?.health;
  }
}
