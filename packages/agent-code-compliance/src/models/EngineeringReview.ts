export interface EngineeringReview {
  id: string;
  sessionId: string;
  violations: string[]; // Violation IDs
  reviewNotes: string[];
  requiredActions: string[];
  approvalRecommendation: 'Approved' | 'Approved with Comments' | 'Rejected' | 'Requires Clarification';
  signOffMetadata?: {
    engineerId?: string;
    timestamp?: string;
    signature?: string;
  };
}
