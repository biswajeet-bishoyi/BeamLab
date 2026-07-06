import { IAgent, ITask, AgentResult } from '../interfaces/IAgent';

export class AgentOrchestrator {
  private agents: Map<string, IAgent> = new Map();

  registerAgent(agent: IAgent): void {
    this.agents.set(agent.id, agent);
  }

  getAgent(id: string): IAgent | undefined {
    return this.agents.get(id);
  }

  async delegateTask(agentId: string, task: ITask): Promise<AgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { taskId: task.id, status: 'failure', error: new Error(`Agent ${agentId} not found`) };
    }
    return agent.executeTask(task);
  }
}
