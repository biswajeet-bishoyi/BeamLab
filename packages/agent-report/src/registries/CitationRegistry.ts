import { CitationGraph } from '../models';

export class CitationRegistry {
  private graphs: Map<string, CitationGraph> = new Map();

  public registerGraph(reportId: string, graph: CitationGraph): void {
    this.graphs.set(reportId, graph);
  }

  public getGraph(reportId: string): CitationGraph | undefined {
    return this.graphs.get(reportId);
  }
}
