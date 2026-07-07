import { EngineeringBlackboard } from './EngineeringBlackboard';

export class WorkflowContext {
  constructor(
    public readonly workflowId: string,
    public readonly blackboard: EngineeringBlackboard,
    public readonly intent: string,
    public readonly workspaceId: string
  ) {}
}
