import { AgentManifest } from '../manifest/AgentManifest';
import { EngineeringDomain, ObjectType, SupportedTask } from '../capabilities/AgentCapability';

export interface AgentRequest {
  taskId: string;
  domain: EngineeringDomain;
  task: SupportedTask;
  objectType: ObjectType;
  inputs: Record<string, any>;
  expectedOutputs: string[];
}

export interface ExecutionPlan {
  requestId: string;
  selectedAgentId: string;
  matchedCapabilities: boolean;
  policyValidationPassed: boolean;
  estimatedRuntimeMs: number;
}

/**
 * Handles capability negotiation: Request -> Candidate Discovery -> Capability Matching -> Policy Validation -> Selection -> Execution Plan
 */
export class NegotiationPipeline {
  private registry: Map<string, AgentManifest> = new Map();

  public registerAgent(manifest: AgentManifest) {
    this.registry.set(manifest.id, manifest);
  }

  public negotiate(request: AgentRequest): ExecutionPlan | null {
    // 1. Candidate Discovery
    const candidates = Array.from(this.registry.values());

    // 2. Capability Matching
    const matched = candidates.filter(agent => {
      const caps = agent.capabilities;
      if (!caps.domains.includes(request.domain) && !caps.domains.includes('general')) return false;
      if (!caps.tasks.includes(request.task)) return false;
      if (!caps.objectTypes.includes(request.objectType) && !caps.objectTypes.includes('any')) return false;
      return true;
    });

    if (matched.length === 0) {
      return null; // No suitable agents
    }

    // Sort by confidence and priority
    matched.sort((a, b) => {
      if (a.capabilities.confidence !== b.capabilities.confidence) {
        return b.capabilities.confidence - a.capabilities.confidence;
      }
      return 0; // Simplified
    });

    const selectedAgent = matched[0];

    // 3. Policy Validation (mocked for A8, connects to policy-engine in future)
    const policyValidationPassed = true;

    // 4. Selection & Execution Plan
    if (!policyValidationPassed) {
      return null;
    }

    return {
      requestId: request.taskId,
      selectedAgentId: selectedAgent.id,
      matchedCapabilities: true,
      policyValidationPassed,
      estimatedRuntimeMs: selectedAgent.capabilities.estimatedRuntimeMs,
    };
  }
}
