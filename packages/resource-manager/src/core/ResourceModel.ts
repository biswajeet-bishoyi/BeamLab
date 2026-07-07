export interface ResourceVersion {
  version: string;
  status: 'Draft' | 'Active' | 'Deprecated';
  createdAt: string;
  updatedAt: string;
}

export interface ResourceProfile<TProfile> {
  id: string; // e.g. 'Geometry', 'Mechanical'
  name: string;
  data: TProfile;
}

export interface Resource<TProperties> {
  id: string;          // e.g. 'BL-RES-ISMB-200'
  type: string;        // Refers to ResourceSchema.resourceType, e.g. 'SteelSection'
  name: string;        // e.g. 'ISMB 200'
  description: string;
  version: ResourceVersion;
  
  // The core properties modeled securely
  properties: TProperties;
  
  // Enterprise extension: Profiles
  profiles?: Record<string, ResourceProfile<any>>;
  
  metadata: {
    source: string;      // e.g. 'IS 800:2007'
    tags: string[];
    [key: string]: any;
  };
}

export interface ResourceRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'CompatibleWith' | 'Requires' | 'Supersedes' | 'Alternative' | 'DerivedFrom' | 'BelongsTo';
  description?: string;
}
