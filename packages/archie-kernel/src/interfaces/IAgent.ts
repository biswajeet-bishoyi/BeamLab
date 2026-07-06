export interface ITask {
  id: string;
  description: string;
  payload: any;
}

export interface AgentResult {
  taskId: string;
  status: 'success' | 'failure';
  data?: any;
  error?: Error;
}

export interface IAgent {
  id: string;
  name: string;
  executeTask(task: ITask): Promise<AgentResult>;
}
