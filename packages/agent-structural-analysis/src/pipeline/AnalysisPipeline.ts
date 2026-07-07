import { AnalysisPlanner } from '../planning/AnalysisPlanner';
import { ModelValidator } from '../validation/ModelValidator';
import { ValidationRuleRegistry } from '../validation/ValidationRuleRegistry';
import { ISolverService, ISolverRequest } from '@beamlab/solver-client';
import { ExecutionContext } from '@beamlab/agent-framework';
import { StructuralReasoningStrategy } from '../intelligence/StructuralReasoningStrategy';

export class AnalysisPipeline {
  private planner = new AnalysisPlanner();
  private validator: ModelValidator;
  private reasoningStrategy = new StructuralReasoningStrategy();

  constructor(
    private solverService: ISolverService,
    validationRegistry: ValidationRuleRegistry
  ) {
    this.validator = new ModelValidator(validationRegistry);
  }

  public async execute(request: any, context: ExecutionContext): Promise<any> {
    console.log('[AnalysisPipeline] Starting Engineering Reasoning Pipeline...');
    
    // 1. Context Collection & Validation
    const validation = await this.validator.validateModel(request.model);
    if (!validation.isValid) {
      console.warn('[AnalysisPipeline] Validation failed', validation.issues);
    }

    // 2. Planning
    const plan = this.planner.planAnalysis(request, context);

    // 3. Solver Execution
    const solverRequest: ISolverRequest = {
      id: crypto.randomUUID(),
      projectId: (context as any).sessionData?.projectId || 'unknown',
      analysisType: plan.requiredSolver,
      units: 'metric',
      analysisParameters: { solverId: plan.requiredSolver, ...request.parameters },
      requestedOutputs: plan.expectedOutputs,
      executionMetadata: {}
    };

    const job = await this.solverService.submitJob(solverRequest);
    const solverResult = await this.solverService.waitForJobCompletion(job.id);

    if (solverResult.status === 'failed') {
      throw new Error(`Solver failed: ${solverResult.errors?.join(', ')}`);
    }

    // 4. Engineering Intelligence & Reasoning
    // Instead of piecemeal interpretation, we hand off to the EISR strategy
    await this.reasoningStrategy.analyze(context, solverResult);
    await this.reasoningStrategy.reason();
    
    const narrative = await this.reasoningStrategy.explain();
    const recommendations = await this.reasoningStrategy.recommend();
    const justification = await this.reasoningStrategy.justify();

    // 5. Final Explanation
    return {
      plan,
      validation,
      solverResult,
      narrative,
      recommendations,
      justification
    };
  }
}
