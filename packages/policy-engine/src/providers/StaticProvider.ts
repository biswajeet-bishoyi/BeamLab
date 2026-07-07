import { IPolicyProvider } from './IPolicyProvider';
import { Policy } from '../core/PolicyModel';

const STARTER_POLICIES: Policy[] = [
  {
    id: 'BL-POL-SAFE-001',
    name: 'Require Approval for Structural Deletion',
    description: 'Deleting a structural member requires explicit approval from an engineer.',
    category: 'Safety',
    priority: 100,
    version: '1.0.0',
    owner: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewStatus: 'Active',
    conditions: {
      type: 'AND',
      children: [
        { type: 'EQ', field: 'action', value: 'Delete' },
        { type: 'EQ', field: 'resource.type', value: 'StructuralMember' }
      ]
    },
    actions: {
      type: 'RequireApproval',
      message: 'Deletion of structural members requires engineering approval to prevent load path disruptions.',
      approvalRoles: ['Engineer', 'LeadEngineer']
    }
  },
  {
    id: 'BL-POL-COMP-001',
    name: 'Allow Report Generation',
    description: 'Any user can generate structural reports.',
    category: 'Execution',
    priority: 10,
    version: '1.0.0',
    owner: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewStatus: 'Active',
    conditions: {
      type: 'EQ',
      field: 'action',
      value: 'GenerateReport'
    },
    actions: {
      type: 'Allow'
    }
  },
  {
    id: 'BL-POL-EXEC-002',
    name: 'Warn on Report Overwrite',
    description: 'Provide a warning when overwriting an existing report.',
    category: 'Execution',
    priority: 20,
    version: '1.0.0',
    owner: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewStatus: 'Active',
    conditions: {
      type: 'AND',
      children: [
        { type: 'EQ', field: 'action', value: 'GenerateReport' },
        { type: 'EQ', field: 'resource.exists', value: true }
      ]
    },
    actions: {
      type: 'AllowWithWarning',
      message: 'This action will overwrite an existing report. Consider appending or versioning instead.',
      suggestedAlternatives: ['AppendReport', 'VersionReport']
    }
  },
  {
    id: 'BL-POL-SAFE-002',
    name: 'Deny Bulk Structural Delete',
    description: 'Prevents the bulk deletion of structural elements without a dedicated workflow.',
    category: 'Safety',
    priority: 1000,
    version: '1.0.0',
    owner: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewStatus: 'Active',
    conditions: {
      type: 'AND',
      children: [
        { type: 'EQ', field: 'action', value: 'BulkDelete' },
        { type: 'EQ', field: 'resource.type', value: 'StructuralMember' }
      ]
    },
    actions: {
      type: 'Deny',
      message: 'Bulk deletion of structural members is strictly prohibited via standard UI actions.',
      suggestedAlternatives: ['Use Bulk Deletion Workflow Pipeline']
    }
  }
];

export class StaticProvider implements IPolicyProvider {
  public async getPolicies(): Promise<Policy[]> {
    return [...STARTER_POLICIES];
  }

  public async getPolicyById(id: string): Promise<Policy | null> {
    return STARTER_POLICIES.find(p => p.id === id) || null;
  }
}
