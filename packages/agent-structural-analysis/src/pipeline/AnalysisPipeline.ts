import { AnalysisPlanner } from '../planning/AnalysisPlanner';
import { ModelValidator } from '../validation/ModelValidator';
import { ValidationRuleRegistry } from '../validation/ValidationRuleRegistry';
import { ISolverService, ISolverRequest } from '@beamlab/solver-client';
import { ResultInterpreter } from '../reasoning/ResultInterpreter';
import { EngineeringReasoner } from '../reasoning/EngineeringReasoner';
import { ReasoningRegistry } from '../reasoning/ReasoningRegistry';
import { RecommendationGenerator } from '../recommendations/RecommendationGenerator';
import { ExplanationBuilder, ExplanationResponse } from '../explanation/ExplanationBuilder';
import { ExecutionContext } from '@beamlab/agent-framework';

export class AnalysisPipeline {
  private planner = new AnalysisPlanner();
  private validator: ModelValidator;
  private interpreter = new ResultInterpreter();
  private reasoner: EngineeringReasoner;
  private recommendationGen = new RecommendationGenerator();
  private explainer = new ExplanationBuilder();

  constructor(
    private solverService: ISolverService,
    validationRegistry: ValidationRuleRegistry,
    reasoningRegistry: ReasoningRegistry
  ) {
    this.validator = new ModelValidator(validationRegistry);
    this.reasoner = new EngineeringReasoner(reasoningRegistry);
  }

  public async execute(request: any, context: ExecutionContext): Promise<ExplanationResponse> {
    console.log('[AnalysisPipeline] Starting Engineering Reasoning Pipeline...');
    
    // 1. Context Collection & Validation
    const validation = await this.validator.validateModel(request.model);
    if (!validation.isValid) {
      console.warn('[AnalysisPipeline] Validation failed', validation.issues);
      // Depending on policy, we might fail early. Here we proceed to show how explanation handles it.
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

    // 4. Result Interpretation
    const interpretedResults = this.interpreter.interpret(solverResult);

    // 5. Engineering Reasoning
    const reasoningSummary = await this.reasoner.reason(interpretedResults);

    // 6. Recommendation Generation
    const recommendations = this.recommendationGen.generate(reasoningSummary.insights);

    // 7. Explanation Building
    const explanation = this.explainer.build(
      plan,
      validation,
      interpretedResults,
      reasoningSummary,
      recommendations
    );

    return explanation;
  }
}
