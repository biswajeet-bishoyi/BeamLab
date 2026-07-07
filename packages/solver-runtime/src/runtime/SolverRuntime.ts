import { SolverRegistry } from '../registry/SolverRegistry';
import { SolverAdapterRegistry } from '../registry/SolverAdapterRegistry';
import { SolverJobManager } from '../jobs/SolverJobManager';
import { SolverSessionManager } from '../manager/SolverSessionManager';
import { SolverManager } from '../manager/SolverManager';
import { MockSolver } from '../adapters/MockSolver';
import { SolverDiagnostics } from '../diagnostics/SolverDiagnostics';
import { SolverEventType } from '../events/SolverEvents';

export class SolverRuntime {
  public adapterRegistry: SolverAdapterRegistry;
  public registry: SolverRegistry;
  public jobManager: SolverJobManager;
  public sessionManager: SolverSessionManager;
  public manager: SolverManager;
  public diagnostics: SolverDiagnostics;

  constructor() {
    this.adapterRegistry = new SolverAdapterRegistry();
    this.registry = new SolverRegistry(this.adapterRegistry);
    this.jobManager = new SolverJobManager(this.adapterRegistry);
    this.sessionManager = new SolverSessionManager();
    this.manager = new SolverManager(this.registry);
    this.diagnostics = new SolverDiagnostics();
  }

  public async initialize(): Promise<void> {
    console.log('[SolverRuntime] Initializing SIF...');
    
    // Register Mock Solver automatically
    const mockSolver = new MockSolver();
    await mockSolver.initialize();
    this.adapterRegistry.register(mockSolver);
    
    this.diagnostics.recordEvent(SolverEventType.SolverRegistered, { solverId: mockSolver.id });

    console.log('[SolverRuntime] Initialization complete');
  }

  public async shutdown(): Promise<void> {
    const adapters = this.adapterRegistry.getAllAdapters();
    for (const adapter of adapters) {
      await adapter.shutdown();
    }
    console.log('[SolverRuntime] Shut down');
  }
}
