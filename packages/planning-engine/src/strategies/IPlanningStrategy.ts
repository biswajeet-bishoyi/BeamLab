import { ExecutionPlanData } from '../models/ExecutionPlan';
import { Intent } from '../classifiers/IntentClassifier';

export interface PlanningContext {
  requestId: string;
  sessionId: string;
  request: string;
  intent: Intent;
  contextGraph: any;
}

export interface IPlanningStrategy {
  name: string;
  supports(intent: Intent): boolean;
  generatePlan(context: PlanningContext): Promise<Partial<ExecutionPlanData>>;
}
