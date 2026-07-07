import { OptimizationCandidate } from '../models';

export interface IAlternativeEvaluator {
  evaluate(candidate: OptimizationCandidate): Promise<void>;
}

export class AlternativeEvaluator implements IAlternativeEvaluator {
  public async evaluate(candidate: OptimizationCandidate): Promise<void> {
    // In a real implementation, this would trigger a structural analysis (Solver)
    // or run heuristic rules against the model changes.
    candidate.status = 'evaluated';
    return Promise.resolve();
  }
}
