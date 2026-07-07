import { ResourceSchema } from '../core/ResourceSchema';

export class ResourceTypeRegistry {
  private schemas: Map<string, ResourceSchema<any>> = new Map();
  private validators: Map<string, any> = new Map(); // Future integration
  private renderers: Map<string, any> = new Map();  // Future integration

  public registerSchema<T>(schema: ResourceSchema<T>) {
    this.schemas.set(schema.resourceType, schema);
  }

  public getSchema(resourceType: string): ResourceSchema<any> | undefined {
    return this.schemas.get(resourceType);
  }

  public getAllSchemas(): ResourceSchema<any>[] {
    return Array.from(this.schemas.values());
  }

  // Future Plugin Extensions
  public registerValidator(resourceType: string, validator: any) {
    this.validators.set(resourceType, validator);
  }

  public registerRenderer(resourceType: string, renderer: any) {
    this.renderers.set(resourceType, renderer);
  }
}

export const typeRegistry = new ResourceTypeRegistry();
