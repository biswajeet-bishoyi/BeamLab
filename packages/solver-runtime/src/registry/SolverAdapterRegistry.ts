import { ISolverAdapter } from '@beamlab/solver-client';

export class SolverAdapterRegistry {
  private adapters: Map<string, ISolverAdapter> = new Map();

  public register(adapter: ISolverAdapter): void {
    if (this.adapters.has(adapter.id)) {
      console.warn(`[SolverAdapterRegistry] Overwriting adapter ${adapter.id}`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: string): ISolverAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAllAdapters(): ISolverAdapter[] {
    return Array.from(this.adapters.values());
  }
}
