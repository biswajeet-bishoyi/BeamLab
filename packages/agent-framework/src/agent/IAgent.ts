import { AgentManifest } from '../manifest/AgentManifest';
import { ExecutionContext } from '../sandbox/ExecutionContext';

/**
 * Core interface that every engineering agent in BeamLab must implement.
 */
export interface IAgent {
  /** The manifest describing this agent's capabilities and dependencies */
  manifest: AgentManifest;

  /** 
   * Initializes the agent, resolving its dependencies and verifying permissions.
   */
  initialize(context: ExecutionContext): Promise<void>;

  /**
   * Executes the agent's primary reasoning or processing pipeline.
   * @param request The task or request payload
   * @param context The execution context and sandbox
   */
  execute(request: any, context: ExecutionContext): Promise<any>;

  /**
   * Gracefully shuts down the agent, releasing any held resources.
   */
  shutdown(): Promise<void>;
}
