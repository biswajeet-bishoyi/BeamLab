export interface CriticalMember {
  elementId: string;
  reason: string;
  utilizationRatio: number;
}

export class CriticalMemberDetector {
  public detect(solverResults: any, behaviors: any[]): CriticalMember[] {
    return [
      {
        elementId: 'beam-12',
        reason: 'Maximum bending moment',
        utilizationRatio: 0.92
      }
    ];
  }
}
