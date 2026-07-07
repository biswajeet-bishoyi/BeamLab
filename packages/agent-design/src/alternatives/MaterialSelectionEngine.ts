export interface MaterialCandidate {
  id: string;
  grade: string;
  strength: number;
  embodiedCarbon: number;
  suitabilityScore: number;
}

export class MaterialSelectionEngine {
  public evaluate(requirements: any, intent: any): MaterialCandidate[] {
    return [
      { id: 'mat-1', grade: 'A992', strength: 345, embodiedCarbon: 1.2, suitabilityScore: 0.95 },
      { id: 'mat-2', grade: 'A36', strength: 250, embodiedCarbon: 1.1, suitabilityScore: 0.60 }
    ].sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }
}
