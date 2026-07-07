export type IntentType = 'Conversational' | 'Informational' | 'EngineeringReasoning' | 'ToolExecution' | 'MultiStepWorkflow';

export interface ExecutionPlan {
  intent: IntentType;
  requiresContext: boolean;
  requiresTools: boolean;
  complexityScore: number; // 1-10
}

export class Planner {
  /**
   * Evaluates the user's prompt to classify intent and build a lightweight execution plan.
   * This determines if we need to hydrate context, pass tool schemas, or just chat.
   */
  public analyzeIntent(prompt: string): ExecutionPlan {
    const p = prompt.toLowerCase();
    
    // Very basic heuristic for the mock implementation
    if (p.includes('create') || p.includes('delete') || p.includes('apply') || p.includes('move')) {
      return { intent: 'ToolExecution', requiresContext: true, requiresTools: true, complexityScore: 3 };
    }
    
    if (p.includes('why') || p.includes('explain') || p.includes('how')) {
      return { intent: 'EngineeringReasoning', requiresContext: true, requiresTools: false, complexityScore: 7 };
    }
    
    if (p.includes('workflow') || p.includes('optimize')) {
      return { intent: 'MultiStepWorkflow', requiresContext: true, requiresTools: true, complexityScore: 10 };
    }
    
    return { intent: 'Conversational', requiresContext: false, requiresTools: false, complexityScore: 1 };
  }
}

export const planner = new Planner();
