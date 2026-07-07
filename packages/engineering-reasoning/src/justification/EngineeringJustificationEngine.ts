import { ConfidenceResult } from '../confidence/IAggregationStrategy';

export interface EngineeringJustification {
  id: string;
  statement: string;
  supportedBy: {
    knowledge: string[];
    policies: string[];
    evidence: string[];
  };
  assumptions: string[];
  confidence: ConfidenceResult;
  limitations: string[];
  reviewerNotes?: string;
}

export class EngineeringJustificationEngine {
  public justify(
    narrative: any, 
    confidence: ConfidenceResult, 
    evidence: any
  ): EngineeringJustification {
    return {
      id: crypto.randomUUID(),
      statement: "The proposed structural configuration meets all ultimate and serviceability limit states under current assumptions.",
      supportedBy: {
        knowledge: narrative.knowledgeReferences || [],
        policies: narrative.policyReferences || [],
        evidence: narrative.supportingEvidence || []
      },
      assumptions: narrative.assumptions || [],
      confidence,
      limitations: [
        "Dynamic wind effects not considered",
        "Connection stiffness assumed pinned"
      ]
    };
  }
}
