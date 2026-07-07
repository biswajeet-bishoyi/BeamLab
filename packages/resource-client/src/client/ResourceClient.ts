import { ResourceEngine, Resource, SearchOptions, StaticProvider } from '@beamlab/resource-manager';

export class ResourceClient {
  private engine: ResourceEngine;
  private isInitialized = false;

  constructor() {
    this.engine = new ResourceEngine();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Register the starter pack by default
    const staticProvider = new StaticProvider();
    this.engine.registerProvider(staticProvider);
    
    this.isInitialized = true;
  }

  public async get<T>(id: string): Promise<Resource<T> | null> {
    if (!this.isInitialized) await this.initialize();
    return this.engine.getResource(id) as Promise<Resource<T> | null>;
  }

  public async search<T = any>(options: SearchOptions): Promise<Resource<T>[]> {
    if (!this.isInitialized) await this.initialize();
    return this.engine.search(options) as Promise<Resource<T>[]>;
  }

  public async list<T = any>(type: string): Promise<Resource<T>[]> {
    if (!this.isInitialized) await this.initialize();
    return this.engine.search({ type }) as Promise<Resource<T>[]>;
  }

  public async categories(): Promise<string[]> {
    if (!this.isInitialized) await this.initialize();
    return this.engine.getCategories();
  }

  // Diagnostic endpoints
  public getEngineInstance(): ResourceEngine {
    return this.engine;
  }
}
