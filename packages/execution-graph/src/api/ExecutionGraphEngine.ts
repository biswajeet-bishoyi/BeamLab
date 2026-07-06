import { ExecutionPlanData } from '@beamlab/planning-engine';
import { ExecutionGraph } from '../models/ExecutionGraph';
import { GraphBuilder } from '../core/GraphBuilder';
import { DependencyResolver } from '../core/DependencyResolver';
import { GraphValidator } from '../core/GraphValidator';
import { GraphOptimizer } from '../core/GraphOptimizer';
import { GraphSerializer } from '../core/GraphSerializer';
import { GraphInspector, GraphInspectionReport } from '../core/GraphInspector';

export class ExecutionGraphEngine {
  private builder: GraphBuilder;
  private validator: GraphValidator;
  private optimizer: GraphOptimizer;
  private serializer: GraphSerializer;
  private inspector: GraphInspector;
  private resolver: DependencyResolver;

  constructor() {
    this.builder = new GraphBuilder();
    this.resolver = new DependencyResolver();
    this.validator = new GraphValidator(this.resolver);
    this.optimizer = new GraphOptimizer();
    this.serializer = new GraphSerializer();
    this.inspector = new GraphInspector();
  }

  public buildGraph(plan: ExecutionPlanData): ExecutionGraph {
    return this.builder.build(plan);
  }

  public validateGraph(graph: ExecutionGraph): boolean {
    return this.validator.validate(graph);
  }

  public optimizeGraph(graph: ExecutionGraph): ExecutionGraph {
    return this.optimizer.optimize(graph);
  }

  public serializeGraph(graph: ExecutionGraph): string {
    return this.serializer.serialize(graph);
  }

  public deserializeGraph(payload: string): ExecutionGraph {
    return this.serializer.deserialize(payload);
  }

  public inspectGraph(graph: ExecutionGraph): GraphInspectionReport {
    return this.inspector.explainGraph(graph);
  }
}
