import { AgentCapability } from '../capabilities/AgentCapability';

/**
 * The manifest becomes the contract between BeamLab and the agent.
 */
export interface AgentManifest {
  /** Unique identifier for the agent */
  id: string;
  
  /** Human readable name */
  name: string;
  
  /** Semantic version of the agent */
  version: string;
  
  /** Author or publisher name */
  author: string;
  
  /** Declared capabilities */
  capabilities: AgentCapability;
  
  /** Required runtime permissions */
  permissions: AgentPermission[];
  
  /** Agent dependencies (e.g., other agents or services) */
  dependencies: string[];
  
  /** Supported BeamLab API version */
  supportedBeamLabVersion: string;
  
  /** Required minimum Agent Runtime version */
  requiredRuntimeVersion: string;
  
  /** JSON Schema for agent-specific configuration */
  configurationSchema?: Record<string, any>;
}

export type AgentPermission =
  | 'workspace:read'
  | 'workspace:write'
  | 'knowledge:read'
  | 'policy:read'
  | 'resource:read'
  | 'network:access'
  | 'filesystem:read'
  | 'filesystem:write';
