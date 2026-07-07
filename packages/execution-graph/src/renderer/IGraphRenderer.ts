export interface UIGraphNode {
  id: string;
  type: string;
  data: any;
  position?: { x: number; y: number };
}

export interface UIGraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface UIGraphData {
  nodes: UIGraphNode[];
  edges: UIGraphEdge[];
}

export interface IGraphRenderer {
  render(data: UIGraphData): void;
  focusNode(nodeId: string): void;
  highlight(nodeIds: string[]): void;
  zoomTo(nodeIds: string[]): void;
  fitView(): void;
  export(): Promise<string>;
}
