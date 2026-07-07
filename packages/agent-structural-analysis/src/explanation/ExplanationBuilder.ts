import { AnalysisPlan } from '../planning/AnalysisPlanner';
import { ValidationSummary } from '../validation/ModelValidator';
import { InterpretedResults } from '../reasoning/ResultInterpreter';
import { ReasoningSummary } from '../reasoning/EngineeringReasoner';
import { Recommendation } from '../recommendations/RecommendationGenerator';

export interface ExplanationResponse {
  analysisObjective: string;
  modelSummary: string;
  validationSummary: ValidationSummary;
  selectedStrategy: string;
  engineeringAssumptions: string[];
  reasoningProcess: ReasoningSummary;
  recommendations: Recommendation[];
  confidenceMetadata: number;
}

export class ExplanationBuilder {
  public build(
    plan: AnalysisPlan,
    validation: ValidationSummary,
    results: InterpretedResults,
    reasoning: ReasoningSummary,
    recommendations: Recommendation[]
  ): ExplanationResponse {
    
    return {
      analysisObjective: plan.objective,
      modelSummary: 'Structural model containing generic members and supports.',
      validationSummary: validation,
      selectedStrategy: plan.requiredSolver,
      engineeringAssumptions: results.engineeringAssumptions,
      reasoningProcess: reasoning,
      recommendations: recommendations,
      confidenceMetadata: validation.isValid ? 0.95 : 0.4
    };
  }
}
