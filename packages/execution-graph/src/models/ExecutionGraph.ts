export type NodeType = 
  | 'ToolCall'
  | 'Skill'
  | 'AgentInvocation'
  | 'ApprovalGate'
  | 'DecisionNode'
  | 'WaitNode'
  | 'ParallelGroup';

export interface GraphNodeData {
  id: string;
  type: NodeType;
  name: string;
  payload: Record<string, any>;
  dependencies: string[]; // IDs of nodes that must complete before this node
}

export class GraphNode {
  constructor(private readonly data: GraphNodeData) {}

  get id(): string { return this.data.id; }
  get type(): NodeType { return this.data.type; }
  get name(): string { return this.data.name; }
  get payload(): Record<string, any> { return { ...this.data.payload }; }
  get dependencies(): string[] { return [...this.data.dependencies]; }

  public toJSON(): GraphNodeData {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      payload: this.payload,
      dependencies: this.dependencies
    };
  }
}

export interface ExecutionGraphData {
  id: string;
  planId: string;
  nodes: GraphNodeData[];
}

export class ExecutionGraph {
  private readonly nodeMap: Map<string, GraphNode>;

  constructor(private readonly data: ExecutionGraphData) {
    this.nodeMap = new Map();
    for (const nodeData of data.nodes) {
      this.nodeMap.set(nodeData.id, new GraphNode(nodeData));
    }
  }

  get id(): string { return this.data.id; }
  get planId(): string { return this.data.planId; }
  
  get nodes(): GraphNode[] {
    return Array.from(this.nodeMap.values());
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodeMap.get(id);
  }

  public toJSON(): ExecutionGraphData {
    return {
      id: this.id,
      planId: this.planId,
      nodes: this.nodes.map(n => n.toJSON())
    };
  }
}
