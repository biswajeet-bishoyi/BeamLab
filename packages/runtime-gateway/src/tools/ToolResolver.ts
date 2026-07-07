import { registry, ToolExecutor, ToolContext } from '@beamlab/tool-registry';

export class ToolResolver {
  private executor = new ToolExecutor();

  /**
   * Retrieves all available tool schemas to pass to the LLM.
   */
  public getAvailableSchemas() {
    return registry.getAll().map(tool => ({
      id: tool.metadata.id,
      name: tool.metadata.name,
      description: tool.metadata.description,
      // We would convert Zod schemas to JSON Schema here in a real implementation
      // schema: zodToJsonSchema(tool.schemas.input)
    }));
  }

  /**
   * Executes a tool via the registry's strict execution pipeline (validates permissions & schemas).
   */
  public async executeTool(toolId: string, args: any, context: ToolContext): Promise<any> {
    return this.executor.execute(toolId, args, context);
  }
}

export const toolResolver = new ToolResolver();
