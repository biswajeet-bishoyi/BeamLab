import { IPlanningStrategy, PlanningContext } from './IPlanningStrategy';
import { ExecutionPlanData } from '../models/ExecutionPlan';
import { Intent } from '../classifiers/IntentClassifier';

export class RulePlanner implements IPlanningStrategy {
  name = 'RulePlanner';

  supports(intent: Intent): boolean {
    return intent === 'Engineering Analysis' || intent === 'Tool Invocation';
  }

  async generatePlan(context: PlanningContext): Promise<Partial<ExecutionPlanData>> {
    // Generate deterministic rule-based graph
    const steps = [];
    
    if (context.intent === 'Engineering Analysis') {
      steps.push({
        id: `step_analyze_${Date.now()}`,
        action: 'analyze_beam',
        arguments: { target: context.request },
        dependencies: [],
        explanation: 'Selected analyze_beam tool to perform engineering analysis based on explicit rule.'
      });
    } else {
      steps.push({
        id: `step_tool_${Date.now()}`,
        action: 'generic_tool',
        arguments: {},
        dependencies: [],
        explanation: 'Fallback tool selected by RulePlanner.'
      });
    }

    return {
      strategy: this.name,
      orderedSteps: steps,
      requiredTools: steps.map(s => s.action)
    };
  }
}
