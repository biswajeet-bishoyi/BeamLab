import { ExecutionGraph, ExecutionGraphData } from '../models/ExecutionGraph';

export class GraphSerializer {
  public serialize(graph: ExecutionGraph): string {
    const data = graph.toJSON();
    return JSON.stringify(data, null, 2);
  }

  public deserialize(payload: string): ExecutionGraph {
    const data = JSON.parse(payload) as ExecutionGraphData;
    return new ExecutionGraph(data);
  }
}
