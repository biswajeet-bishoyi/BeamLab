export type WorkflowNodeType = 
  | 'Agent'
  | 'Decision'
  | 'Approval'
  | 'Synchronization'
  | 'Condition'
  | 'ParallelGroup'
  | 'WorkflowStart'
  | 'WorkflowEnd';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  agentId?: string; // If type is 'Agent'
  configuration?: Record<string, any>;
  status?: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Paused';
}

export type WorkflowEdgeType =
  | 'Requires'
  | 'Produces'
  | 'Consumes'
  | 'DependsOn'
  | 'Blocks'
  | 'Triggers'
  | 'Synchronizes';

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: WorkflowEdgeType;
  dataKey?: string; // E.g., which piece of evidence is produced/consumed
}

export interface WorkflowGraph {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
