export type PlatformServiceType = 
  | 'ContextEngine'
  | 'KnowledgePlatform'
  | 'PolicyEngine'
  | 'ResourceManager'
  | 'MemorySystem'
  | 'ToolRegistry'
  | 'SolverRuntime'
  | 'EngineeringReasoning'
  | 'AgentRuntime';

export class PlatformServiceRegistry {
  private services: Map<PlatformServiceType, any> = new Map();

  public register<T>(type: PlatformServiceType, service: T): void {
    if (this.services.has(type)) {
      console.warn(`[PlatformServiceRegistry] Overwriting service for ${type}`);
    }
    this.services.set(type, service);
  }

  public get<T>(type: PlatformServiceType): T {
    const service = this.services.get(type);
    if (!service) {
      throw new Error(`[PlatformServiceRegistry] Service ${type} not found!`);
    }
    return service as T;
  }
}
