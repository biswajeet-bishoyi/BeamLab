/**
 * BeamLab B1.6 — Model Dependency Graph Engine
 *
 * Direct Acyclic Graph (DAG) construction, cycle detection, orphan detection,
 * topological sorting, and dependency traversal for the Canonical Engineering Model.
 */

import { EngineeringModel } from '../model/EngineeringModel';
import { IEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';

export interface GraphNode {
  readonly id: string;
  readonly name: string;
  readonly type: EngineeringObjectType | 'Custom';
}

export interface GraphEdge {
  readonly sourceId: string;
  readonly targetId: string;
  readonly role: string;
}

export interface DependencyCycle {
  readonly cyclePath: string[];
  readonly description: string;
}

export interface DependencyGraphData {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
  readonly hasCycles: boolean;
  readonly cycles: DependencyCycle[];
  readonly orphanIds: string[];
}

export class DependencyGraphEngine {
  private readonly _nodes: Map<string, GraphNode> = new Map();
  private readonly _forwardEdges: Map<string, Map<string, string>> = new Map(); // sourceId -> (targetId -> role)
  private readonly _reverseEdges: Map<string, Set<string>> = new Map(); // targetId -> Set<sourceId>

  constructor(model?: EngineeringModel) {
    if (model) {
      this.buildFromModel(model);
    }
  }

  /**
   * Populate dependency graph from an EngineeringModel instance.
   */
  public buildFromModel(model: EngineeringModel): void {
    this.clear();
    const allObjects = model.objects.all();

    // 1. Register all nodes
    for (const obj of allObjects) {
      this._nodes.set(obj.identity.id, {
        id: obj.identity.id,
        name: obj.identity.name,
        type: obj.objectType,
      });
      this._forwardEdges.set(obj.identity.id, new Map());
      if (!this._reverseEdges.has(obj.identity.id)) {
        this._reverseEdges.set(obj.identity.id, new Set());
      }
    }

    // 2. Register edges based on explicit relationship references & dependencyIds
    for (const obj of allObjects) {
      const sourceId = obj.identity.id;
      const refs = obj.relationships.references;

      for (const [role, targetId] of Object.entries(refs)) {
        if (targetId && this._nodes.has(targetId)) {
          this.addEdge(sourceId, targetId, role);
        }
      }

      for (const targetId of obj.relationships.dependencyIds) {
        if (targetId && this._nodes.has(targetId) && !this._forwardEdges.get(sourceId)?.has(targetId)) {
          this.addEdge(sourceId, targetId, 'dependsOn');
        }
      }
    }
  }

  public addEdge(sourceId: string, targetId: string, role: string = 'references'): void {
    if (!this._nodes.has(sourceId)) {
      this._nodes.set(sourceId, { id: sourceId, name: sourceId, type: 'Custom' });
    }
    if (!this._nodes.has(targetId)) {
      this._nodes.set(targetId, { id: targetId, name: targetId, type: 'Custom' });
    }
    if (!this._forwardEdges.has(sourceId)) this._forwardEdges.set(sourceId, new Map());
    if (!this._reverseEdges.has(targetId)) this._reverseEdges.set(targetId, new Set());

    this._forwardEdges.get(sourceId)!.set(targetId, role);
    this._reverseEdges.get(targetId)!.add(sourceId);
  }

  /**
   * Get all entities that the specified object directly depends upon.
   */
  public getDependenciesOf(id: string): string[] {
    const targets = this._forwardEdges.get(id);
    return targets ? Array.from(targets.keys()) : [];
  }

  /**
   * Get all entities that directly depend on the specified object.
   */
  public getDependentsOf(id: string): string[] {
    const sources = this._reverseEdges.get(id);
    return sources ? Array.from(sources) : [];
  }

  /**
   * Detect any circular references in the model using depth-first search cycle coloring.
   */
  public findCycles(): DependencyCycle[] {
    const cycles: DependencyCycle[] = [];
    const color = new Map<string, number>(); // 0: White (unvisited), 1: Gray (visiting), 2: Black (visited)
    const parent = new Map<string, string>();

    for (const nodeId of this._nodes.keys()) {
      color.set(nodeId, 0);
    }

    const dfs = (u: string, path: string[]): void => {
      color.set(u, 1);
      path.push(u);

      const neighbors = this._forwardEdges.get(u);
      if (neighbors) {
        for (const v of neighbors.keys()) {
          const vColor = color.get(v) ?? 0;
          if (vColor === 1) {
            // Cycle detected!
            const cycleStart = path.indexOf(v);
            const cyclePath = path.slice(cycleStart).concat([v]);
            cycles.push({
              cyclePath,
              description: `Circular dependency detected: ${cyclePath.join(' -> ')}`,
            });
          } else if (vColor === 0) {
            parent.set(v, u);
            dfs(v, path);
          }
        }
      }

      path.pop();
      color.set(u, 2);
    };

    for (const nodeId of this._nodes.keys()) {
      if ((color.get(nodeId) ?? 0) === 0) {
        dfs(nodeId, []);
      }
    }

    return cycles;
  }

  /**
   * Find orphan entities that are neither depended upon by any other entity,
   * nor depend on any entity (e.g. isolated nodes or unassigned profiles).
   */
  public findOrphans(): string[] {
    const orphans: string[] = [];
    for (const id of this._nodes.keys()) {
      const outgoing = this._forwardEdges.get(id)?.size ?? 0;
      const incoming = this._reverseEdges.get(id)?.size ?? 0;
      if (outgoing === 0 && incoming === 0) {
        orphans.push(id);
      }
    }
    return orphans;
  }

  /**
   * Compute a topological ordering of the model objects.
   * Entities that are depended upon appear before the entities that depend on them.
   */
  public getTopologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    for (const id of this._nodes.keys()) {
      // In topological sorting for dependency graphs: target must be built before source
      // So degree of source = number of outgoing dependencies it needs first
      inDegree.set(id, this._forwardEdges.get(id)?.size ?? 0);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      result.push(u);

      // Notify all dependents that rely on u
      const dependents = this._reverseEdges.get(u);
      if (dependents) {
        for (const dep of dependents) {
          const newDeg = (inDegree.get(dep) ?? 1) - 1;
          inDegree.set(dep, newDeg);
          if (newDeg === 0) {
            queue.push(dep);
          }
        }
      }
    }

    return result;
  }

  /**
   * Export the graph to a Cytoscape/D3 compatible structure.
   */
  public exportData(): DependencyGraphData {
    const nodes = Array.from(this._nodes.values());
    const edges: GraphEdge[] = [];

    for (const [sourceId, targetMap] of this._forwardEdges.entries()) {
      for (const [targetId, role] of targetMap.entries()) {
        edges.push({ sourceId, targetId, role });
      }
    }

    const cycles = this.findCycles();
    const orphanIds = this.findOrphans();

    return {
      nodes,
      edges,
      hasCycles: cycles.length > 0,
      cycles,
      orphanIds,
    };
  }

  /**
   * Export the dependency graph to standard GraphViz DOT format.
   */
  public exportDot(): string {
    const lines = ['digraph CEM_DependencyGraph {', '  rankdir=LR;', '  node [shape=box, fontname="Inter"];'];

    for (const node of this._nodes.values()) {
      lines.push(`  "${node.id}" [label="${node.name}\\n(${node.type})"];`);
    }

    for (const [sourceId, targetMap] of this._forwardEdges.entries()) {
      for (const [targetId, role] of targetMap.entries()) {
        lines.push(`  "${sourceId}" -> "${targetId}" [label="${role}"];`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  public clear(): void {
    this._nodes.clear();
    this._forwardEdges.clear();
    this._reverseEdges.clear();
  }
}
