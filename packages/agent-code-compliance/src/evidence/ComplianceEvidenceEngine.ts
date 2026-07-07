import { RuleEvaluation, ComplianceEvidenceGraph, EvidenceNode, EvidenceEdge } from '../models';

export interface IComplianceEvidenceEngine {
  buildGraph(sessionId: string, evaluations: RuleEvaluation[]): ComplianceEvidenceGraph;
}

export class ComplianceEvidenceEngine implements IComplianceEvidenceEngine {
  public buildGraph(sessionId: string, evaluations: RuleEvaluation[]): ComplianceEvidenceGraph {
    const nodes: EvidenceNode[] = [];
    const edges: EvidenceEdge[] = [];

    evaluations.forEach(evaluation => {
      // Create Rule Node
      nodes.push({
        id: `node-${evaluation.ruleId}`,
        type: 'Rule',
        label: `Rule ${evaluation.ruleId}`,
        data: { ruleId: evaluation.ruleId }
      });

      // Create Evaluation Node
      const evalNodeId = `node-${evaluation.id}`;
      nodes.push({
        id: evalNodeId,
        type: 'Calculation',
        label: `Evaluation ${evaluation.id}`,
        data: evaluation
      });

      // Edge from Evaluation to Rule
      edges.push({
        source: evalNodeId,
        target: `node-${evaluation.ruleId}`,
        relationship: 'evaluates'
      });
      
      // We would also add inputs, standard, etc.
    });

    return {
      id: `graph-${sessionId}`,
      sessionId,
      nodes,
      edges
    };
  }
}
