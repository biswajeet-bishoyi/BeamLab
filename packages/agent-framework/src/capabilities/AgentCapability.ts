/**
 * Defines the strongly typed capabilities an agent can declare.
 */

export type EngineeringDomain = 
  | 'structural' 
  | 'architectural' 
  | 'mechanical' 
  | 'electrical' 
  | 'civil' 
  | 'general';

export type SupportedTask = 
  | 'analysis' 
  | 'design' 
  | 'optimization' 
  | 'compliance' 
  | 'reporting' 
  | 'knowledge_retrieval' 
  | 'workspace_management';

export type ObjectType = 
  | 'beam' 
  | 'column' 
  | 'node' 
  | 'load' 
  | 'material' 
  | 'section' 
  | 'any';

export interface AgentCapability {
  /** The engineering domains this agent understands */
  domains: EngineeringDomain[];
  
  /** The types of tasks this agent can perform */
  tasks: SupportedTask[];
  
  /** The object types this agent can process */
  objectTypes: ObjectType[];
  
  /** Required input schemas or object types */
  requiredInputs: string[];
  
  /** Expected output schemas or object types */
  producedOutputs: string[];
  
  /** Required knowledge bases or standards (e.g. 'IS800:2007') */
  requiredKnowledge: string[];
  
  /** Required resource types (e.g. 'SteelSection') */
  requiredResources: string[];
  
  /** Required policy rules */
  requiredPolicies: string[];
  
  /** Estimated execution runtime in milliseconds */
  estimatedRuntimeMs: number;
  
  /** Confidence score (0.0 to 1.0) of succeeding in declared tasks */
  confidence: number;
  
  /** Execution priority preference */
  priority: 'low' | 'normal' | 'high' | 'critical';
}
