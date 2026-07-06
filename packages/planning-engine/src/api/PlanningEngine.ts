import { ToolRegistry } from '@beamlab/tool-registry';
import { ExecutionPlan, ExecutionPlanData } from '../models/ExecutionPlan';
import { IntentClassifier, Intent } from '../classifiers/IntentClassifier';
import { IPlanningStrategy, PlanningContext } from '../strategies/IPlanningStrategy';
import { RulePlanner } from '../strategies/RulePlanner';
import { ToolResolver } from '../subsystems/ToolResolver';
import { ConstraintEngine } from '../subsystems/ConstraintEngine';
import { ApprovalPlanner } from '../subsystems/ApprovalPlanner';
import { CostEstimator } from '../subsystems/CostEstimator';
import { PlanValidator } from '../subsystems/PlanValidator';
import { PlanExplainer } from '../subsystems/PlanExplainer';

export class PlanningEngine {
  private classifier = new IntentClassifier();
  private toolResolver: ToolResolver;
  private constraintEngine = new ConstraintEngine();
  private approvalPlanner = new ApprovalPlanner();
  private costEstimator = new CostEstimator();
  private planValidator = new PlanValidator();
  private planExplainer = new PlanExplainer();
  private strategies: IPlanningStrategy[] = [];

  constructor(toolRegistry: ToolRegistry) {
    this.toolResolver = new ToolResolver(toolRegistry);
    this.strategies.push(new RulePlanner());
  }

  async createPlan(sessionId: string, requestId: string, request: string, contextGraph: any): Promise<ExecutionPlan> {
    const intent = this.classifyIntent(request);
    const strategy = this.strategies.find(s => s.supports(intent));

    if (!strategy) {
      throw new Error(`No planning strategy found for intent: ${intent}`);
    }

    const planningContext: PlanningContext = { sessionId, requestId, request, intent, contextGraph };
    const rawPlan = await strategy.generatePlan(planningContext);

    // Hydrate plan
    rawPlan.planId = `plan_${Date.now()}`;
    rawPlan.requestId = requestId;
    rawPlan.sessionId = sessionId;
    rawPlan.userIntent = intent;
    rawPlan.version = '1.0.0';

    await this.toolResolver.resolveCapabilities(rawPlan.requiredTools || []);
    
    rawPlan.constraints = this.constraintEngine.evaluateConstraints(contextGraph, rawPlan.requiredTools || []);
    rawPlan.requiredApprovals = this.approvalPlanner.determineApprovals(rawPlan.requiredTools || [], rawPlan.constraints);
    
    this.costEstimator.estimate(rawPlan);
    this.planValidator.validate(rawPlan);

    return new ExecutionPlan(rawPlan as ExecutionPlanData);
  }

  classifyIntent(request: string): Intent {
    return this.classifier.classifyIntent(request);
  }

  explainPlan(plan: ExecutionPlan): string {
    return this.planExplainer.explain(plan.raw);
  }
}
