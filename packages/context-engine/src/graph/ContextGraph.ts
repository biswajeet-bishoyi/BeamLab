import { GraphNode, GraphNodeType } from '../interfaces/ContextTypes';

export class ContextGraph {
  private nodes = new Map<string, GraphNode>();

  public addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  public removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    
    // Clean up references
    node.parents.forEach(pid => {
      const p = this.nodes.get(pid);
      if (p) p.children = p.children.filter(cid => cid !== id);
    });
    node.children.forEach(cid => {
      const c = this.nodes.get(cid);
      if (c) c.parents = c.parents.filter(pid => pid !== id);
    });

    this.nodes.delete(id);
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  public getNodesByType(type: GraphNodeType): GraphNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  public serialize(): string {
    return JSON.stringify(Array.from(this.nodes.values()));
  }
}
