import { ConfidenceResult } from '../confidence/IAggregationStrategy';
import { EngineeringJustification } from '../justification/EngineeringJustificationEngine';
import { EngineeringNarrative } from '../narrative/EngineeringNarrativeBuilder';

export interface IEngineeringReasoner {
  analyze(context: any, evidence: any): Promise<void>;
  reason(): Promise<void>;
  recommend(): Promise<any[]>;
  explain(): Promise<EngineeringNarrative>;
  confidence(): Promise<ConfidenceResult>;
  justify(): Promise<EngineeringJustification>;
}

export interface IReasoningStrategy extends IEngineeringReasoner {
  id: string;
  domain: string;
}
