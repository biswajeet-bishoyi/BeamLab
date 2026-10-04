import type {
  FactoredLoadCombination,
  MemberComplianceCheck,
  SectionOptimizationProposal,
  CalculationNoteSection,
  HumanApprovalGate,
  OrchestrationStatus,
} from '@beamstudio/archie-kernel';

export interface ReasoningLogEntry {
  id: string;
  timestamp: number;
  agentId: string;
  agentName: string;
  agentColor: string;
  action: string;
  message: string;
  details?: string;
  equations?: string[];
  severity: 'info' | 'success' | 'warning' | 'error';
}

export interface CopilotStudioState {
  sessionId: string;
  status: OrchestrationStatus;
  goalPrompt: string;
  designCode: 'EUROCODE_3' | 'AISC_360_16' | 'IS_800';
  steelGrade: 'S355' | 'S275' | 'A992_GR50';
  
  // Execution Plan DAG
  steps: Array<{
    id: string;
    title: string;
    action: string;
    agent: string;
    dependencies: string[];
    status: 'pending' | 'active' | 'completed' | 'failed' | 'paused';
    progress: number;
    durationMs?: number;
  }>;
  
  // Stream logs
  logs: ReasoningLogEntry[];
  
  // Active approval gate
  pendingGate: HumanApprovalGate | null;
  
  // Engineering Blackboard deliverables
  loadCombinations: FactoredLoadCombination[];
  complianceChecks: MemberComplianceCheck[];
  optimizationProposals: SectionOptimizationProposal[];
  calculationNote: {
    markdown: string;
    html: string;
    sections: CalculationNoteSection[];
  } | null;
  
  // KPIs
  initialWeightKg: number;
  optimizedWeightKg: number;
  weightSavingsPercent: number;
  maxUtilizationRatio: number;
  governingLimitState?: string;
  governingElementId?: string;
}
