export interface ExecutionPlanData {
  planId: string;
  requestId: string;
  sessionId: string;
  userIntent: string;
  strategy: string;
  orderedSteps: PlanStep[];
  requiredContext: string[];
  requiredTools: string[];
  requiredSkills: string[];
  requiredAgents: string[];
  dependencies: string[];
  constraints: ConstraintViolation[];
  estimatedDurationMs: number;
  estimatedTokenCost: number;
  estimatedComputeCost: number;
  requiredApprovals: ApprovalRequirement[];
  metadata: Record<string, any>;
  version: string;
}

export interface PlanStep {
  id: string;
  action: string;
  arguments: Record<string, any>;
  dependencies: string[];
  explanation: string;
}

export interface ConstraintViolation {
  type: 'engineering' | 'runtime' | 'permission' | 'policy';
  message: string;
  severity: 'warning' | 'fatal';
}

export interface ApprovalRequirement {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  reason: string;
}

export class ExecutionPlan {
  private readonly data: Readonly<ExecutionPlanData>;

  constructor(data: ExecutionPlanData) {
    this.data = this.deepFreeze({ ...data });
  }

  get id(): string { return this.data.planId; }
  get steps(): ReadonlyArray<PlanStep> { return this.data.orderedSteps; }
  get raw(): Readonly<ExecutionPlanData> { return this.data; }

  private deepFreeze<T>(obj: T): Readonly<T> {
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
      const value = (obj as any)[name];
      if (value && typeof value === 'object') {
        this.deepFreeze(value);
      }
    }
    return Object.freeze(obj);
  }
}
