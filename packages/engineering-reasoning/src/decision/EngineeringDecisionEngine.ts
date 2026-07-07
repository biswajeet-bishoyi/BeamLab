export interface EvaluationCriteria {
  id: string;
  name: string;
  weight: number;
}

export interface CandidateEvaluation {
  candidateId: string;
  scores: Record<string, number>; // criteriaId -> score
  totalScore: number;
}

export interface DecisionMatrix {
  criteria: EvaluationCriteria[];
  evaluations: CandidateEvaluation[];
}

export interface DecisionExplanation {
  recommendedCandidateId: string;
  rationale: string;
  keyTradeOffs: string[];
}

export class EngineeringDecisionEngine {
  public evaluate(
    candidates: string[], 
    criteria: EvaluationCriteria[], 
    scoreFn: (candidateId: string, criteriaId: string) => number
  ): DecisionMatrix {
    const evaluations = candidates.map(candidateId => {
      const scores: Record<string, number> = {};
      let totalScore = 0;
      
      for (const criterion of criteria) {
        const score = scoreFn(candidateId, criterion.id);
        scores[criterion.id] = score;
        totalScore += score * criterion.weight;
      }
      
      return { candidateId, scores, totalScore };
    });

    return { criteria, evaluations };
  }

  public decide(matrix: DecisionMatrix): DecisionExplanation {
    if (matrix.evaluations.length === 0) {
      throw new Error('No candidates to evaluate');
    }

    // Sort by descending score
    const sorted = [...matrix.evaluations].sort((a, b) => b.totalScore - a.totalScore);
    const best = sorted[0];

    const rationale = `Recommended candidate ${best.candidateId} with a total score of ${best.totalScore.toFixed(2)}.`;
    const keyTradeOffs: string[] = [];

    if (sorted.length > 1) {
      const runnerUp = sorted[1];
      // Find where runner up beat the winner
      matrix.criteria.forEach(c => {
        if (runnerUp.scores[c.id] > best.scores[c.id]) {
          keyTradeOffs.push(`Sacrificed some ${c.name} compared to ${runnerUp.candidateId}.`);
        }
      });
    }

    return {
      recommendedCandidateId: best.candidateId,
      rationale,
      keyTradeOffs
    };
  }
}
