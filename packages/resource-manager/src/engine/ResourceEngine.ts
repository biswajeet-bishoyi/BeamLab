import { ResourceRegistry } from '../registry/ResourceRegistry';
import { ResourceCache } from '../cache/ResourceCache';
import { ResourceSearch, SearchOptions } from '../search/ResourceSearch';
import { IResourceProvider } from '../providers/IResourceProvider';
import { Resource } from '../core/ResourceModel';
import { resourceEventBus } from '../events/ResourceEventBus';
import { typeRegistry } from '../registry/ResourceTypeRegistry';

export class ResourceEngine {
  private registry: ResourceRegistry;
  private cache: ResourceCache;
  private searchEngine: ResourceSearch;

  constructor() {
    this.registry = new ResourceRegistry();
    this.cache = new ResourceCache();
    this.searchEngine = new ResourceSearch(this.registry);
  }

  public registerProvider(provider: IResourceProvider) {
    this.registry.registerProvider(provider);
    resourceEventBus.emit('ResourceRegistered', { providerName: provider.name });
  }

  public async getResource(id: string): Promise<Resource<any> | null> {
    resourceEventBus.emit('ResourceRequested', { id });

    let resource = this.cache.get(id);
    if (resource) {
      resourceEventBus.emit('ResourceCached', { id, action: 'hit' });
      return resource;
    }

    resourceEventBus.emit('ResourceCached', { id, action: 'miss' });
    resource = await this.registry.getResource(id);

    if (resource) {
      this.cache.set(resource);
      resourceEventBus.emit('ResourceLoaded', { id });
    }

    return resource;
  }

  public async search(options: SearchOptions): Promise<Resource<any>[]> {
    return this.searchEngine.search(options);
  }

  public async getCategories(): Promise<string[]> {
    // Collect all unique resource types (categories)
    const schemas = typeRegistry.getAllSchemas();
    return schemas.map(s => s.resourceType);
  }
  
  public getRegistry(): ResourceRegistry {
    return this.registry;
  }
  
  public getCacheStats() {
    return this.cache.getStats();
  }
}
