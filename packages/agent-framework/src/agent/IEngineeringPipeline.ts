import { ExecutionContext } from '../sandbox/ExecutionContext';

/**
 * Standardized lifecycle for all engineering pipelines.
 */
export interface IEngineeringPipeline {
  execute(request: any, context: ExecutionContext): Promise<any>;
  
  // Standard lifecycle hooks
  collectContext(request: any, context: ExecutionContext): Promise<any>;
  retrieveKnowledge(context: any): Promise<any>;
  evaluatePolicy(context: any, knowledge: any): Promise<any>;
  resolveResources(context: any): Promise<any>;
  plan(context: any, knowledge: any, policy: any, resources: any): Promise<any>;
  executeDiscipline(plan: any): Promise<any>;
  reason(executionResult: any): Promise<any>;
  recommend(reasoning: any): Promise<any>;
  generateNarrative(reasoning: any, recommendations: any): Promise<any>;
  createResponse(narrative: any): Promise<any>;
}
