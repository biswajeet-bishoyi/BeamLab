export interface ConstructabilityObservation {
  id: string;
  category: 'fabrication' | 'transportation' | 'installation' | 'maintenance';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export class ConstructabilityAnalyzer {
  public analyze(alternative: any): ConstructabilityObservation[] {
    return [
      {
        id: crypto.randomUUID(),
        category: 'installation',
        severity: 'medium',
        description: 'Selected section depth may require coped connections at primary girders.'
      },
      {
        id: crypto.randomUUID(),
        category: 'transportation',
        severity: 'low',
        description: 'Members fit within standard legal transport limits.'
      }
    ];
  }
}
