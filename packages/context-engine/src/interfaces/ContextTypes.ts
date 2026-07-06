export type GraphNodeType = 
  | 'Project' 
  | 'Frame' 
  | 'Member' 
  | 'Node' 
  | 'Support' 
  | 'Load' 
  | 'Material' 
  | 'Section' 
  | 'Result' 
  | 'Report';

export interface GraphNode<T = any> {
  id: string;
  type: GraphNodeType;
  data: T;
  children: string[]; // IDs of child nodes
  parents: string[];  // IDs of parent nodes
}

export interface ProjectContext {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceContext {
  activeTab: string;
  zoomLevel: number;
  gridEnabled: boolean;
}

export interface UserContext {
  userId: string;
  roles: string[];
}

// And so on for all 12 domains.
export type AnyContext = ProjectContext | WorkspaceContext | UserContext | Record<string, any>;
