import type { IGraphRenderer, UIGraphData } from './IGraphRenderer';

export class ReactFlowRenderer implements IGraphRenderer {
  private flowInstance: any; 

  constructor(flowInstance: any) {
    this.flowInstance = flowInstance;
  }

  render(data: UIGraphData): void {
    if (this.flowInstance) {
      this.flowInstance.setNodes(data.nodes);
      this.flowInstance.setEdges(data.edges);
    }
  }

  focusNode(nodeId: string): void {
    if (this.flowInstance) {
      const node = this.flowInstance.getNode(nodeId);
      if (node) {
        this.flowInstance.setCenter(node.position.x, node.position.y, { zoom: 1.5, duration: 800 });
      }
    }
  }

  highlight(nodeIds: string[]): void {
    if (this.flowInstance) {
      this.flowInstance.setNodes((nds: any[]) =>
        nds.map((n: any) => ({
          ...n,
          style: { ...n.style, opacity: nodeIds.includes(n.id) ? 1 : 0.2 },
        }))
      );
    }
  }

  zoomTo(nodeIds: string[]): void {
    if (this.flowInstance) {
      const nodes = nodeIds.map(id => this.flowInstance.getNode(id)).filter(Boolean);
      if (nodes.length > 0) {
        this.flowInstance.fitView({ nodes, duration: 800, padding: 0.2 });
      }
    }
  }

  fitView(): void {
    if (this.flowInstance) {
      this.flowInstance.fitView({ duration: 800, padding: 0.2 });
    }
  }

  async export(): Promise<string> {
    if (this.flowInstance) {
      return JSON.stringify(this.flowInstance.toObject());
    }
    return '{}';
  }
}
