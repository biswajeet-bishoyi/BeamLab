import { PolicyExpression } from './PolicyExpression';

export type PolicyCategory = 
  | 'Approval' 
  | 'Execution' 
  | 'Permission' 
  | 'Safety' 
  | 'Compliance' 
  | 'Recommendation' 
  | 'Knowledge' 
  | 'Automation' 
  | 'Plugin' 
  | 'Agent' 
  | 'Workspace' 
  | 'Organization';

export type ActionType = 'Allow' | 'AllowWithWarning' | 'RequireApproval' | 'Deny' | 'Defer' | 'RecommendAlternative';

export interface PolicyAction {
  type: ActionType;
  message?: string;
  suggestedAlternatives?: string[];
  approvalRoles?: string[];
}

export interface Policy {
  id: string; // e.g. BL-POL-SAFE-001
  name: string;
  description: string;
  category: PolicyCategory;
  priority: number; // Higher number = higher priority
  version: string;
  conditions: PolicyExpression;
  actions: PolicyAction;
  owner: string;
  createdAt: string;
  updatedAt: string;
  reviewStatus: 'Draft' | 'Active' | 'Deprecated';
}

export interface ActionRequest {
  action: string; // e.g. 'Delete'
  resource: {
    type: string; // e.g. 'StructuralMember'
    id?: string;
    [key: string]: any;
  };
  context: {
    user: string;
    roles: string[];
    [key: string]: any;
  };
}

export interface PolicyDecision {
  decision: ActionType;
  matchedPolicies: string[]; // Policy IDs
  explanation: string;
  evaluatedRules: number;
  executionTimeMs: number;
  warnings?: string[];
  suggestedAlternatives?: string[];
}
