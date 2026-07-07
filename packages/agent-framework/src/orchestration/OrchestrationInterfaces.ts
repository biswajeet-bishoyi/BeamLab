import { ExecutionContext } from '../sandbox/ExecutionContext';

/**
 * Interfaces for multi-agent execution orchestrations
 */

export interface ISequentialCollaboration {
  executeSequence(agents: string[], initialPayload: any, context: ExecutionContext): Promise<any>;
}

export interface IParallelCollaboration {
  executeParallel(agents: string[], payload: any, context: ExecutionContext): Promise<any[]>;
}

export interface IHierarchicalDelegation {
  delegate(supervisorId: string, workerIds: string[], task: any, context: ExecutionContext): Promise<any>;
}

export interface IPeerCollaboration {
  collaborate(peerIds: string[], goal: string, context: ExecutionContext): Promise<any>;
}

export interface ISupervisorAgent {
  reviewAndApprove(result: any, context: ExecutionContext): Promise<boolean>;
}
