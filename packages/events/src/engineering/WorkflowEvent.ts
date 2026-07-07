import { EngineeringEvent } from './EngineeringEvent';

export type WorkflowEventType =
  | 'WorkflowRequested'
  | 'WorkflowPlanned'
  | 'AgentAssigned'
  | 'WorkflowStarted'
  | 'AgentStarted'
  | 'AgentCompleted'
  | 'ConflictDetected'
  | 'DecisionGenerated'
  | 'WorkflowCompleted'
  | 'WorkflowCancelled'
  | 'WorkflowFailed';

export interface WorkflowEvent extends EngineeringEvent {
  category: 'Workflow';
  type: WorkflowEventType;
  workflowId: string;
  data: any;
}
