import { Resource } from '../core/ResourceModel';
import { ResourceSchema } from '../core/ResourceSchema';

// In order to avoid circular dependencies or import issues, let's redefine ResourceSchema locally or import it.
// Wait, ResourceSchema is in '../core/ResourceSchema'.

export interface IResourceProvider {
  name: string;
  description: string;
  version: string;
  
  // Exposes what schemas this provider contributes
  getSchemas?(): import('../core/ResourceSchema').ResourceSchema<any>[];
  
  getResourceById(id: string): Promise<Resource<any> | null>;
  getResourcesByType(type: string): Promise<Resource<any>[]>;
  getAllResources(): Promise<Resource<any>[]>;
  
  // Future: search natively within provider
  // search?(query: any): Promise<Resource<any>[]>;
}
