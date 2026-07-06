export class Scheduler {
  private executionQueue: any[] = [];
  
  async enqueueTask(task: any): Promise<string> {
    const taskId = `task_${Date.now()}`;
    this.executionQueue.push({ id: taskId, ...task });
    return taskId;
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const index = this.executionQueue.findIndex(t => t.id === taskId);
    if (index > -1) {
      this.executionQueue.splice(index, 1);
      return true;
    }
    return false;
  }
}
