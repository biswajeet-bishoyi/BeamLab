import { describe, it, expect } from 'vitest';
import { EngineeringModel } from '../model/EngineeringModel';
import { DependencyGraphEngine } from './DependencyGraphEngine';

describe('B1.6 DependencyGraphEngine', () => {
  it('builds forward and reverse dependency maps for structural entities', () => {
    const model = new EngineeringModel('model-dag-01', { name: 'DAG Test' });
    model.addNode('n1', 'Node 1', 0, 0, 0, 'struct-1');
    model.addNode('n2', 'Node 2', 4, 0, 0, 'struct-1');
    const mat = model.addMaterial('mat-1', 'S355', 210e9, 81e9, 0.3, 7850, 'Steel');
    const sec = model.addSection('sec-1', 'IPE 300', 5.38e-3, 6.04e-6, 8.36e-5, 2.01e-7);
    model.addMember('m1', 'Member 1', 'n1', 'n2', mat.identity.id, sec.identity.id, 'struct-1');
    model.addSupport('sup1', 'Support 1', 'n1', 'struct-1');

    const graph = model.getDependencyGraph();

    // Member m1 depends on n1, n2, mat-1, sec-1
    const m1Deps = graph.getDependenciesOf('m1');
    expect(m1Deps).toContain('n1');
    expect(m1Deps).toContain('n2');
    expect(m1Deps).toContain('mat-1');
    expect(m1Deps).toContain('sec-1');

    // Reverse: Node n1 is depended on by m1 and sup1
    const n1Dependents = graph.getDependentsOf('n1');
    expect(n1Dependents).toContain('m1');
    expect(n1Dependents).toContain('sup1');

    // Section sec-1 is depended on by m1
    const secDependents = graph.getDependentsOf('sec-1');
    expect(secDependents).toContain('m1');

    // No circular dependencies
    expect(graph.findCycles()).toHaveLength(0);

    // Topological order
    const topo = graph.getTopologicalOrder();
    expect(topo.indexOf('n1')).toBeLessThan(topo.indexOf('m1'));
    expect(topo.indexOf('mat-1')).toBeLessThan(topo.indexOf('m1'));
  });

  it('detects circular dependencies when artificially introduced', () => {
    const graph = new DependencyGraphEngine();
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');
    graph.addEdge('C', 'A'); // Cycle: A -> B -> C -> A

    const cycles = graph.findCycles();
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]?.description).toContain('Circular dependency detected');
  });

  it('exports graph to Cytoscape and DOT formats', () => {
    const model = new EngineeringModel('model-export', { name: 'Export Test' });
    model.addNode('n1', 'Node 1', 0, 0, 0, 'struct-1');
    model.addNode('n2', 'Node 2', 5, 0, 0, 'struct-1');
    const mat = model.addMaterial('mat-1', 'S355', 210e9, 81e9, 0.3, 7850, 'Steel');
    const sec = model.addSection('sec-1', 'IPE 300', 5.38e-3, 6.04e-6, 8.36e-5, 2.01e-7);
    model.addMember('m1', 'Member 1', 'n1', 'n2', mat.identity.id, sec.identity.id, 'struct-1');

    const graph = model.getDependencyGraph();
    const data = graph.exportData();

    expect(data.nodes.length).toBeGreaterThanOrEqual(4);
    expect(data.edges.length).toBeGreaterThanOrEqual(4);
    expect(data.hasCycles).toBe(false);

    const dot = graph.exportDot();
    expect(dot).toContain('digraph CEM_DependencyGraph');
    expect(dot).toContain('"m1" -> "n1"');
  });
});
