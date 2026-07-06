import { ToolRegistry } from '@beamlab/tool-registry';

export class ToolResolver {
  constructor(private registry: ToolRegistry) {}

  async resolveCapabilities(toolIds: string[]): Promise<boolean> {
    for (const id of toolIds) {
      const tool = this.registry.get(id);
      if (!tool) {
        throw new Error(`Tool ${id} is required by plan but not registered in ToolRegistry.`);
      }
    }
    return true;
  }
}
