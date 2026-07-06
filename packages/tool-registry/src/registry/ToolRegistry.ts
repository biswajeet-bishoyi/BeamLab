import { BaseTool } from '../interfaces/BaseTool';

export class ToolRegistry {
  private tools: Map<string, BaseTool<any, any>> = new Map();

  public register(tool: BaseTool<any, any>): void {
    if (this.tools.has(tool.metadata.id)) {
      throw new Error(`Tool with ID ${tool.metadata.id} is already registered.`);
    }
    this.tools.set(tool.metadata.id, tool);
  }

  public get(toolId: string): BaseTool<any, any> | undefined {
    return this.tools.get(toolId);
  }

  public getAll(): BaseTool<any, any>[] {
    return Array.from(this.tools.values());
  }

  public resolveByCategory(category: string): BaseTool<any, any>[] {
    return this.getAll().filter(t => t.metadata.category === category);
  }
}

export const registry = new ToolRegistry();
