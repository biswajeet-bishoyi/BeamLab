import { ResourceRegistry } from '../registry/ResourceRegistry';
import { Resource } from '../core/ResourceModel';

export interface SearchOptions {
  query?: string;
  type?: string;
  tags?: string[];
  limit?: number;
}

export class ResourceSearch {
  private registry: ResourceRegistry;

  constructor(registry: ResourceRegistry) {
    this.registry = registry;
  }

  public async search(options: SearchOptions): Promise<Resource<any>[]> {
    let resources = await this.registry.getAllResources();

    if (options.type) {
      resources = resources.filter(r => r.type === options.type);
    }

    if (options.query) {
      const q = options.query.toLowerCase();
      resources = resources.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.description.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.metadata.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (options.tags && options.tags.length > 0) {
      resources = resources.filter(r => 
        options.tags!.every(tag => r.metadata.tags.includes(tag))
      );
    }

    if (options.limit && options.limit > 0) {
      resources = resources.slice(0, options.limit);
    }

    return resources;
  }
}
