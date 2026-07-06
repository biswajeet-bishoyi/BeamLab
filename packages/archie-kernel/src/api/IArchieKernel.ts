import { IPlanner } from '../interfaces/IPlanner';
import { IMemoryProvider } from '../interfaces/IMemoryProvider';
import { ISkill } from '../interfaces/ISkill';
import { IAgent, ITask, AgentResult } from '../interfaces/IAgent';

export interface RuntimeStatus {
  state: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  uptime: number;
}

export interface SessionConfig {
  projectId: string;
  userId: string;
}

export interface KernelRequest {
  id: string;
  payload: any;
}

export interface KernelResponse {
  id: string;
  status: 'success' | 'failure';
  data?: any;
}

export interface ExecutionResult {
  status: 'success' | 'failure';
  details?: any;
}

export interface IArchieKernel {
  start(): Promise<void>;
  shutdown(): Promise<void>;
  getRuntimeStatus(): RuntimeStatus;

  createSession(config: SessionConfig): Promise<string>;
  processRequest(sessionId: string, request: KernelRequest): Promise<KernelResponse>;
  cancelExecution(executionId: string): Promise<void>;
  resumeExecution(executionId: string): Promise<void>;

  registerPlanner(name: string, planner: IPlanner): void;
  registerMemoryProvider(name: string, provider: IMemoryProvider): void;
  registerSkill(skill: ISkill): void;
  registerAgent(agent: IAgent): void;

  executePlan(sessionId: string, plan: any): Promise<ExecutionResult>;
  invokeSkill(skillId: string, args: any): Promise<any>;
  invokeAgent(agentId: string, task: ITask): Promise<AgentResult>;
}
