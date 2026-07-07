import { Resource, ResourceVersion } from '../core/ResourceModel';
import { IResourceProvider } from '../providers/IResourceProvider';
import { typeRegistry } from './ResourceTypeRegistry';

export class ResourceRegistry {
  private providers: IResourceProvider[] = [];

  public registerProvider(provider: IResourceProvider) {
    this.providers.push(provider);
    
    // Auto-register schemas from provider if they expose them
    if (provider.getSchemas) {
      provider.getSchemas().forEach(schema => {
        typeRegistry.registerSchema(schema);
      });
    }
  }

  public async getResource(id: string): Promise<Resource<any> | null> {
    for (const provider of this.providers) {
      const resource = await provider.getResourceById(id);
      if (resource) return resource;
    }
    return null;
  }

  public async getResourcesByType(type: string): Promise<Resource<any>[]> {
    const results: Resource<any>[] = [];
    for (const provider of this.providers) {
      const resources = await provider.getResourcesByType(type);
      results.push(...resources);
    }
    return results;
  }

  public async getAllResources(): Promise<Resource<any>[]> {
    const results: Resource<any>[] = [];
    for (const provider of this.providers) {
      const resources = await provider.getAllResources();
      results.push(...resources);
    }
    return results;
  }

  public getProviders(): IResourceProvider[] {
    return this.providers;
  }
}
