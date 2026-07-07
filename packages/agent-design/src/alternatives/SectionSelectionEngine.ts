export interface SectionCandidate {
  id: string;
  family: string;
  designation: string;
  weightPerMeter: number;
  suitabilityScore: number;
  availability: 'high' | 'medium' | 'low';
}

export class SectionSelectionEngine {
  public evaluate(requirements: any, intent: any): SectionCandidate[] {
    return [
      { id: 'sec-1', family: 'W-Shape', designation: 'W14x22', weightPerMeter: 32.7, suitabilityScore: 0.85, availability: 'high' as const },
      { id: 'sec-2', family: 'W-Shape', designation: 'W12x26', weightPerMeter: 38.7, suitabilityScore: 0.90, availability: 'high' as const },
      { id: 'sec-3', family: 'HSS', designation: 'HSS8x8x1/4', weightPerMeter: 37.5, suitabilityScore: 0.70, availability: 'medium' as const }
    ].sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }
}
