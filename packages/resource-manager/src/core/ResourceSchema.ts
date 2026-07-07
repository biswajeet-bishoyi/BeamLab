export interface ResourcePropertyMetadata {
  name: string;
  displayName: string;
  description: string;
  unit?: string;
  category: string; // e.g., 'Geometry', 'Mechanical'
  type: 'number' | 'string' | 'boolean' | 'enum' | 'object';
  options?: string[]; // for enum
  min?: number;
  max?: number;
  defaultValue?: any;
  validationRules?: string[]; // strings that UI or Validators can parse
}

export interface ResourceSchema<TProperties> {
  resourceType: string;
  displayName: string;
  description: string;
  properties: ResourcePropertyMetadata[];
  // Potential extension points
  renderers?: string[];
  validators?: string[];
}
