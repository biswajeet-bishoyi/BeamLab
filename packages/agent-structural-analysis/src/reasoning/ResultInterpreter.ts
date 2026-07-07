import { SolverResponse } from '../solver/SolverTypes';

export interface InterpretedResults {
  maxDeflection: number;
  maxMoment: number;
  maxShear: number;
  maxAxialForce: number;
  supportReactions: Record<string, any>;
  criticalMembers: string[];
  potentialInstability: boolean;
  warnings: string[];
  engineeringAssumptions: string[];
}

export class ResultInterpreter {
  public interpret(response: SolverResponse): InterpretedResults {
    const raw = response.results || {};
    
    return {
      maxDeflection: raw.maxDeflection || 0,
      maxMoment: raw.maxMoment || 0,
      maxShear: raw.maxShear || 0,
      maxAxialForce: raw.maxAxialForce || 0,
      supportReactions: raw.reactions || {},
      criticalMembers: raw.criticalMembers || [],
      potentialInstability: raw.maxDeflection > 100, // naive check
      warnings: response.warnings || [],
      engineeringAssumptions: [
        'Linear elastic material behavior',
        'Small deformations',
        'Rigid connections'
      ]
    };
  }
}
