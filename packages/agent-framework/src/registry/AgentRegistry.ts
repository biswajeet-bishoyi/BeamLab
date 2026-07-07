import { IAgent } from '../agent/IAgent';
import { AgentManifest } from '../manifest/AgentManifest';

/**
 * The Agent Registry manages discovery, orchestration, and lifecycle 
 * of both System Agents and Extension Agents in BeamLab.
 */
export class AgentRegistry {
  private agents: Map<string, IAgent> = new Map();
  private manifests: Map<string, AgentManifest> = new Map();

  /**
   * Discovers and registers an agent based on its manifest and implementation.
   * This supports both built-in system agents and future plugin-based extension agents.
   */
  public registerAgent(agent: IAgent): void {
    const manifest = agent.manifest;
    
    if (this.agents.has(manifest.id)) {
      console.warn(`[AgentRegistry] Overwriting existing agent with ID: ${manifest.id}`);
    }

    this.agents.set(manifest.id, agent);
    this.manifests.set(manifest.id, manifest);
  }

  /**
   * Retrieves an agent by its unique identifier.
   */
  public getAgent(id: string): IAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Returns a list of all registered agent manifests.
   * Useful for orchestration and capability matching.
   */
  public getAllManifests(): AgentManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Finds agents that declare a specific capability.
   */
  public findAgentsByCapability(capabilityKey: string): IAgent[] {
    return Array.from(this.agents.values()).filter(agent => {
      // Assuming capabilities are key-value objects or arrays in the manifest
      const caps = agent.manifest.capabilities as Record<string, any>;
      return caps && (caps[capabilityKey] !== undefined || (Array.isArray(caps) && caps.includes(capabilityKey)));
    });
  }

  /**
   * Unregisters an agent from the registry.
   */
  public unregisterAgent(id: string): void {
    this.agents.delete(id);
    this.manifests.delete(id);
  }
}
