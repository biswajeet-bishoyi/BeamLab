import { WorkflowGraph, WorkflowNode } from '../models';
import { WorkflowContext } from '../context';
import { EngineeringNegotiationEngine, ConsensusEngine } from '../coordination';

export class WorkflowScheduler {
  constructor(
    private context: WorkflowContext,
    private negotiationEngine: EngineeringNegotiationEngine,
    private consensusEngine: ConsensusEngine
  ) {}

  public async execute(graph: WorkflowGraph): Promise<void> {
    const sortedNodes = this.topologicalSort(graph);
    
    for (const node of sortedNodes) {
      await this.executeNode(node);
    }
  }

  private async executeNode(node: WorkflowNode): Promise<void> {
    node.status = 'Running';
    
    // Simulate node execution based on type
    if (node.type === 'Agent') {
      // Typically, this would emit an AgentAssigned event and wait for AgentCompleted
      console.log(`[WorkflowScheduler] Executing Agent Node: ${node.name}`);
    } else if (node.type === 'Decision') {
      console.log(`[WorkflowScheduler] Executing Decision Node: ${node.name}`);
      const recs = this.context.blackboard.getRecommendations();
      
      // Attempt Negotiation First
      const negotiationResult = await this.negotiationEngine.negotiate(['agent1', 'agent2'], recs);
      
      if (negotiationResult.status === 'Consensus' && negotiationResult.finalRecommendations) {
        // Then reach consensus/decision matrix
        const decision = this.consensusEngine.reachConsensus('policy-safety-first', negotiationResult.finalRecommendations);
        this.context.blackboard.publish('FinalDecision', decision);
      } else {
        this.context.blackboard.publish('FinalDecision', { outcome: 'Requires Human Review' });
      }
    }
    
    node.status = 'Completed';
  }

  private topologicalSort(graph: WorkflowGraph): WorkflowNode[] {
    // Basic topological sort implementation
    // For simplicity, returning nodes in order they were defined, assuming they are ordered logically for now
    return graph.nodes;
  }
}
